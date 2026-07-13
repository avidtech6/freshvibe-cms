// runtime/install-editor.js
//
// Public entry point for the FES (Frontend Editing System).
//
// The host (e.g. Oscar-web) calls installEditor() once on page load.
// The function wires up:
//   - the selection singleton
//   - chip-click routing (selection → panel-open)
//   - dev mode toggling (chips + breadcrumb visible only in dev mode)
//
// The host then calls openModulePanel(moduleId) and openRegionPanel(regionId)
// from its own click handlers. The FES does NOT own the panels —
// the host does. The FES only routes.
//
// Per app-pact §3.7 + §3.8: the FES does not write into website-owned
// panels. openModulePanel() calls the host's createModulePanel() callback
// (provided in opts). The host decides what panel body to render.
//
// Per app-pact §3.9: this file is the only public entry point. Other
// modules can import it; they should NOT import from runtime/selection.js,
// runtime/outline.js, etc. directly.

import { getSelection } from './selection.js';
import { startOutlines, stopOutlines, refreshOutlines } from './outline.js';
import { mountBreadcrumb, unmountBreadcrumb } from './breadcrumb.js';
import { autoDetectEverything } from './region-scanner.js';

let _installed = false;
let _opts = null;

/**
 * Install the FES. Idempotent.
 *
 * @param {Object} opts
 * @param {Object} opts.panelManager — the PanelManager singleton (host-owned).
 *                                       Pass window.PanelManager || window.OscarPanelManager.
 * @param {Object} opts.mount — DOM mount points:
 *   - chips: HTMLElement where region/widget chips mount (defaults: body)
 *   - breadcrumb: HTMLElement where breadcrumb mounts (defaults: body)
 * @param {Object} opts.callbacks — host callbacks the FES calls:
 *   - createModulePanel(moduleId): the host creates a panel for the module.
 *                                  Returns the panel id (or null to skip).
 *   - createRegionPanel(regionId): the host creates a panel for the region.
 *                                  Returns the panel id (or null to skip).
 *   - onSelectionChange(selection): the host is notified of selection changes.
 *                                   Use this to refresh your own UI.
 * @param {boolean} opts.devMode — initial dev mode. If true, chips + breadcrumb
 *                                  are visible from the start. If false (default),
 *                                  they appear when the host calls setDevMode(true).
 * @param {Function} opts.setDevMode — optional, host can pass a setter:
 *                                     installEditor wires a way to toggle dev mode.
 *                                     Default: exposes window.__oscarCmsSetDevMode.
 */
export function installEditor(opts = {}) {
  if (_installed) return _opts;
  _installed = true;
  _opts = opts;

  const panelManager = opts.panelManager || (typeof window !== 'undefined' ? (window.PanelManager || window.OscarPanelManager) : null);
  if (!panelManager) {
    console.warn('[FES] installEditor: no panelManager provided; panels will not work');
  }

  const mount = opts.mount || {};
  const chipsHost = mount.chips || (typeof document !== 'undefined' ? document.body : null);
  const breadcrumbHost = mount.breadcrumb || (typeof document !== 'undefined' ? document.body : null);

  const callbacks = opts.callbacks || {};

  // Wire selection → chip-click → panel-open
  // When a chip is clicked, the FES sets the selection. The host's
  // chip-click handler is also called (via the outline module's click
  // events). The host decides what panel to create.
  if (panelManager) {
    const sel = getSelection();
    sel.onChange((current, previous) => {
      // Notify host of selection change
      if (callbacks.onSelectionChange) {
        try { callbacks.onSelectionChange(current, previous); } catch (e) { /* host error, ignore */ }
      }
      // Auto-open the panel for the new selection (if dev mode)
      if (current && current.kind && current.id && isDevMode()) {
        if (current.kind === 'module' && callbacks.createModulePanel) {
          try { callbacks.createModulePanel(current.id); } catch (e) { console.error('[FES] createModulePanel:', e?.message || e); }
        } else if (current.kind === 'region' && callbacks.createRegionPanel) {
          try { callbacks.createRegionPanel(current.id); } catch (e) { console.error('[FES] createRegionPanel:', e?.message || e); }
        }
      }
    });
  }

  // Wire dev mode toggle
  if (opts.setDevMode) {
    opts.setDevMode(setDevMode);
  } else if (typeof window !== 'undefined') {
    window.__oscarCmsSetDevMode = setDevMode;
  }

  // Initial dev mode state
  if (opts.devMode) {
    setDevMode(true);
  }

  // Runtime region/module detection. FvRE does an offline pass, but
  // its detector misses things. We walk the live DOM and add any
  // regions FvRE didn't find. Idempotent: re-runs are no-ops.
  if (typeof document !== 'undefined' && opts.runtimeScan !== false) {
    try {
      const result = autoDetectEverything();
      if (result.regionsAdded > 0 || result.modulesAdded > 0) {
        console.info('[FES] runtime scan: +' + result.regionsAdded + ' regions, +' + result.modulesAdded + ' modules');
      }
    } catch (e) {
      console.warn('[FES] runtime scan failed:', e?.message || e);
    }
  }

  console.info('[FES] installed. Use setDevMode(true) to enter dev mode.');
  return _opts;
}

/**
 * Public: open a module panel for the given module id. Routes through
 * the host's createModulePanel callback.
 */
export function openModulePanel(moduleId) {
  if (!_opts || !_opts.callbacks || !_opts.callbacks.createModulePanel) {
    console.warn('[FES] openModulePanel: no createModulePanel callback');
    return null;
  }
  return _opts.callbacks.createModulePanel(moduleId);
}

/**
 * Public: open a region panel for the given region id. Routes through
 * the host's createRegionPanel callback.
 */
export function openRegionPanel(regionId) {
  if (!_opts || !_opts.callbacks || !_opts.callbacks.createRegionPanel) {
    console.warn('[FES] openRegionPanel: no createRegionPanel callback');
    return null;
  }
  return _opts.callbacks.createRegionPanel(regionId);
}

let _devMode = false;

/**
 * Public: toggle dev mode. When true, chips + breadcrumb are visible
 * and selection auto-opens panels. When false, the page is clean for
 * normal visitors.
 */
export function setDevMode(on) {
  _devMode = !!on;
  if (_devMode) {
    if (typeof document !== 'undefined') document.body.classList.add('fvcms-dev-mode');
    startOutlines();
    const breadcrumbHost = _opts && _opts.mount && _opts.mount.breadcrumb;
    if (breadcrumbHost) mountBreadcrumb(breadcrumbHost);
  } else {
    if (typeof document !== 'undefined') document.body.classList.remove('fvcms-dev-mode');
    stopOutlines();
    unmountBreadcrumb();
  }
  return _devMode;
}

/**
 * Public: get current dev mode state.
 */
export function isDevMode() {
  return _devMode;
}

/**
 * Public: uninstall. For tests and rollback.
 */
export function uninstallEditor() {
  if (!_installed) return;
  setDevMode(false);
  _installed = false;
  _opts = null;
  _devMode = false;
}
