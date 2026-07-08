// demo/cms-panel.js — wires the FreshVibe CMS into the real panel manager.
// Reuses Oscar's panel manager behaviour verbatim — pills, drag, dock,
// smart minimise, full-height docked, no scrollbars, 6-dot grip,
// invisible dock on mobile.

import { getStore, getModuleDef } from './runtime/index.js';
import { renderSkinPicker } from './runtime/skin.js';
import { renderGroupToggleUI } from './runtime/group-toggle.js';
import { showRegionOverlays, hideRegionOverlays } from './runtime/visualizer.js';
import { openEditorShell } from './runtime/editor-shell.js';
// CSS injection (browsers can't ES-import stylesheets)
function ensureBridgeCSS() {
  if (document.getElementById('fvcms-bridge-styles')) return;
  const link = document.createElement('link');
  link.id = 'fvcms-bridge-styles';
  link.rel = 'stylesheet';
  link.href = './panel-bridge.css';
  document.head.appendChild(link);
}
ensureBridgeCSS();

const PANEL_ID = 'fvcms-cms-panel';

let _mgr = null;

export function mountCmsPanel() {
  const api = window.PanelManager || window.OscarPanelManager;
  if (!api) {
    console.warn('[fvcms] PanelManager not loaded — falling back to inline panel');
    return false;
  }
  _mgr = api.create();

  // The dev icon (`{ }`) — a tiny floating button the operator can
  // tap to summon the CMS panel. Sits bottom-right, above mobile
  // safe-area, scales on touch.
  const btn = document.createElement('button');
  btn.id = 'fvcms-dev-btn';
  btn.setAttribute('onclick', 'window.__fvcmsTogglePanel()');
  btn.textContent = '{ }';
  document.body.appendChild(btn);

  // The toggle. Acts as a master switch for the panel system AND
  // the dev button itself:
  //   - If any panel is currently visible (docked-active or floating),
  //     collapse ALL of them to parked (docked-collapsed) pills AND
  //     hide the { } button. Dev mode is fully off; the operator
  //     sees the raw website with no chrome.
  //   - Otherwise, activate ALL docked-collapsed panels and show
  //     the { } button. Dev mode is on.
  //
  // Each panel remembers its previous docked-active/floating state
  // via the isHidden flag the manager sets; we just flip them all.
  window.__fvcmsTogglePanel = function () {
    const all = _mgr.list().panels;
    const anyVisible = all.some(function (p) {
      return p.state === 'docked-active' || p.state === 'floating';
    });

    if (anyVisible) {
      // Dev mode OFF: hide everything and the { } button.
      all.forEach(function (p) {
        if (p.state === 'docked-active' || p.state === 'floating') {
          if (p.state === 'docked-active') _mgr.collapse(p.id);
        }
      });
      document.body.classList.remove('fvcms-dev-on');
      return;
    }

    // Dev mode ON: activate all parked panels and show the { } button.
    const cms = all.find(function (p) { return p.id === PANEL_ID; });
    if (!cms) {
      _mgr.addPanel({
        id: PANEL_ID,
        title: 'FreshVibe CMS',
        content: document.createElement('div'),
        position: { x: 40, y: 80, w: 360, h: 520 },
      });
      _mgr.dock(PANEL_ID, 'left');
      _refreshPanelContent();
    } else if (cms.state === 'hidden') {
      _mgr.dock(PANEL_ID, 'left');
      _refreshPanelContent();
    }

    all.forEach(function (p) {
      if (p.id === PANEL_ID) return;
      if (p.state === 'docked-collapsed') {
        _mgr.activate(p.id);
      } else if (p.state === 'hidden' && p.dockEdge) {
        _mgr.activate(p.id);
      }
    });
    document.body.classList.add('fvcms-dev-on');
  };

  // On boot, the button is visible but the panel is hidden.
  // Hidden state: registered in the mgr but with no DOM yet.
  // We register it lazily on first toggle.

  // Expose editor openers
  window.__fvcmsOpenEditor = (moduleInstanceId) => {
    const store = getStore();
    const m = store.getModule(moduleInstanceId);
    if (!m) return;
    const def = getModuleDef(m.moduleId);
    if (!def) {
      alert(`No canonical module found for "${m.moduleId}".`);
      return;
    }
    // Open in the operator-grade editor shell
    openEditorShell({ moduleInstance: m, moduleDef: def, store });
  };
  window.__fvcmsShowOverlays = showRegionOverlays;
  window.__fvcmsHideOverlays = hideRegionOverlays;
  window.__fvcmsHighlightRegion = highlightRegion;
  window.__fvcmsClearHighlight = clearRegionHighlight;

  return true;
}

/**
 * Highlight a single region on the page while editing it. Pins a
 * yellow tag to the top-left corner of the region (follows scroll)
 * and adds a glowing yellow outline. Pass null/undefined to clear.
 *
 * Implementation notes:
 *   - Tag uses position:fixed; we re-position it every frame
 *     (rAF) against the region's live rect so it stays glued to
 *     the region even as the page scrolls.
 *   - Only ONE region can be highlighted at a time — calling this
 *     with a new regionId replaces the previous highlight.
 *   - The "← back" button on the tag focuses the region panel so
 *     the operator can switch from page-level scrolling back to
 *     the dock panel.
 */
let _editingRegion = null;        // { regionId, target, tagEl, rafHandle }
function highlightRegion(regionId) {
  clearRegionHighlight();
  if (!regionId) return;
  const store = getStore();
  const region = store.getRegion(regionId);
  if (!region) return;
  const target = document.querySelector(region.selector);
  if (!target) return;

  // Smoothly scroll the region into view (centred).
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Outline the region element.
  target.classList.add('fvcms-editing-region');

  // Pin a floating tag to the region's top-left corner.
  const tagEl = document.createElement('div');
  tagEl.className = 'fvcms-editing-region-tag';
  const labelSpan = document.createElement('span');
  labelSpan.textContent = 'Editing: ' + (region.label || regionId);
  const backBtn = document.createElement('button');
  backBtn.className = 'fvcms-editing-region-back';
  backBtn.type = 'button';
  backBtn.textContent = '← back to panel';
  tagEl.appendChild(labelSpan);
  tagEl.appendChild(backBtn);
  document.body.appendChild(tagEl);
  tagEl.querySelector('.fvcms-editing-region-back').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Focus the corresponding region panel so the operator can
    // hop back to it from the page view.
    const mgr = (window.PanelManager || window.OscarPanelManager).get();
    if (!mgr) return;
    const panelId = 'fvcms-region-' + regionId;
    const panel = mgr.panels[panelId];
    if (panel) _focusPanel(panelId);
  });

  // Reposition the tag every frame against the live region rect.
  function positionTag() {
    if (!_editingRegion) return;
    const r = target.getBoundingClientRect();
    // Tag sits just above the region's top edge, left-aligned.
    const tagRect = tagEl.getBoundingClientRect();
    let left = r.left;
    let top = r.top - tagRect.height - 6;
    if (top < 8) top = r.top + 6;     // flip below if no room above
    tagEl.style.left = Math.max(8, left) + 'px';
    tagEl.style.top = Math.max(8, top) + 'px';
  }
  positionTag();
  const raf = () => {
    if (!_editingRegion) return;
    positionTag();
    _editingRegion.rafHandle = requestAnimationFrame(raf);
  };
  const handle = requestAnimationFrame(raf);

  _editingRegion = { regionId, target, tagEl, rafHandle: handle };
}

function clearRegionHighlight() {
  if (!_editingRegion) return;
  const { target, tagEl, rafHandle } = _editingRegion;
  _editingRegion = null;
  if (rafHandle) cancelAnimationFrame(rafHandle);
  if (target && target.parentNode) target.classList.remove('fvcms-editing-region');
  if (tagEl && tagEl.parentNode) tagEl.parentNode.removeChild(tagEl);
}

async function _refreshPanelContent() {
  const store = getStore();
  const page = store.getPage(store.activeContext.page);
  if (!page) return;

  // Find the panel's body and fill it with the CMS nav.
  const panel = document.querySelector('[data-panel-id="' + PANEL_ID + '"]');
  if (!panel) return;
  const body = panel.querySelector('.fvcms-pm-body');
  if (!body) return;
  body.innerHTML = '';
  body.appendChild(buildCmsContent(page));
}

function buildCmsContent(page) {
  const root = document.createElement('div');
  root.className = 'fvcms-cms-host';

  // Header
  const head = document.createElement('div');
  head.style.cssText = 'font-size:11px; color:#b0c0b0; margin-bottom:8px;';
  const modules = (function () {
    const out = [];
    for (const regionId of page.regionIds) {
      const r = getStore().listRegionsForPage(page.id).find(x => x.id === regionId);
      if (r) for (const g of getStore().listGroupsForRegion(regionId)) {
        for (const m of getStore().listModulesForGroup(g.id)) out.push(m);
      }
    }
    return out;
  })();
  head.textContent = `${page.regionIds.length} regions · ${modules.length} modules on this page`;
  root.appendChild(head);

  // Status line
  const status = document.createElement('div');
  status.className = 'fvcms-status-line';
  status.id = 'fvcms-status';
  status.textContent = 'Idle — pick a module below to edit';
  root.appendChild(status);

  // Region overlays
  const ovSec = document.createElement('div');
  ovSec.style.cssText = 'margin: 10px 0;';
  ovSec.innerHTML = '<div style="font-size:11px;color:#c0e0c0;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Region overlays</div>';
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 6px;';
  const onBtn = document.createElement('button');
  onBtn.textContent = 'Show';
  onBtn.style.cssText = 'flex:1;background:rgba(60,100,60,0.4);color:#e8e8e0;border:1px solid rgba(120,160,120,0.3);border-radius:4px;padding:4px 10px;cursor:pointer;font:11px ui-monospace,monospace;';
  onBtn.addEventListener('click', () => window.__fvcmsShowOverlays());
  const offBtn = document.createElement('button');
  offBtn.textContent = 'Hide';
  offBtn.style.cssText = onBtn.style.cssText;
  offBtn.addEventListener('click', () => window.__fvcmsHideOverlays());
  btnRow.appendChild(onBtn);
  btnRow.appendChild(offBtn);
  ovSec.appendChild(btnRow);
  root.appendChild(ovSec);

  // Skin picker
  const skinSec = document.createElement('div');
  skinSec.style.cssText = 'margin: 10px 0;';
  skinSec.innerHTML = '<div style="font-size:11px;color:#c0e0c0;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Skin</div>';
  skinSec.appendChild(renderSkinPicker({ onChange: (id) => {
    status.textContent = id ? `Skin applied: ${id.replace('skin-', '')}` : 'Skin cleared';
  }}));
  root.appendChild(skinSec);

  // Module list (region-grouped)
  const modSec = document.createElement('div');
  modSec.style.cssText = 'margin: 10px 0;';
  modSec.innerHTML = '<div style="font-size:11px;color:#c0e0c0;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Modules</div>';

  const store = getStore();
  const def = getModuleDef;
  for (const regionId of page.regionIds) {
    const region = store.listRegionsForPage(page.id).find(x => x.id === regionId);
    if (!region) continue;
    const rHead = document.createElement('div');
    rHead.style.cssText = 'font-size:10px;color:#b0c0b0;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-top:8px;padding-top:6px;border-top:1px solid rgba(120,160,120,0.2);cursor:pointer;';
    rHead.textContent = region.label + ' →';
    rHead.title = 'Click to open the ' + region.label + ' panel';
    rHead.addEventListener('click', () => {
      // Ensure the region panel exists, then make it the focused one.
      const panelId = 'fvcms-region-' + region.id;
      const mgr = (window.PanelManager || window.OscarPanelManager).get();
      const exists = mgr.list().panels.find(p => p.id === panelId);
      if (!exists) {
        // Region panel hasn't been created yet. Bootstrap a quick
        // panel using the region renderer.
        import('./runtime/visualizer.js').then((v) => {
          v.showRegionOverlays();
          _focusPanel(panelId);
        });
      } else {
        _focusPanel(panelId);
      }
      status.textContent = `Focused: ${region.label}`;
    });
    modSec.appendChild(rHead);
    for (const group of store.listGroupsForRegion(region.id)) {
      for (const m of store.listModulesForGroup(group.id)) {
        const label = (m.config.text || m.config.title || m.config.buttonText || '').toString().substring(0, 18);
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(120,160,120,0.1);font-size:10px;';
        row.innerHTML = `
          <span style="font-size:9px;background:rgba(60,100,60,0.4);padding:1px 6px;border-radius:3px;color:#d0e0d0;">${m.moduleId.replace('M-', '')}</span>
          <span style="flex:1;color:#d0d8d0;" title="${label}">${label || '—'}</span>
          <button style="background:rgba(180,140,80,0.7);color:#fff;border:none;padding:3px 10px;border-radius:4px;cursor:pointer;font:10px ui-monospace,monospace;">Open</button>
        `;
        row.querySelector('button').addEventListener('click', () => {
          window.__fvcmsOpenEditor(m.id);
          status.textContent = `Editing: ${m.moduleId} ${m.id}`;
        });
        modSec.appendChild(row);
      }
    }
  }
  root.appendChild(modSec);

  // Region panels button (regions are now first-class panels)
  const regSec = document.createElement('div');
  regSec.style.cssText = 'margin: 10px 0; padding-top: 10px; border-top: 1px solid rgba(120, 160, 120, 0.2);';
  regSec.innerHTML = '<div style="font-size:11px;color:#c0e0c0;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px;">Regions</div>';

  const regBtnRow = document.createElement('div');
  regBtnRow.style.cssText = 'display:flex;gap:6px;';
  const regShow = document.createElement('button');
  regShow.type = 'button';
  regShow.textContent = 'Show region panels';
  regShow.style.cssText = 'flex:1;padding:6px 10px;background:rgba(180,140,80,0.3);color:#fff;border:1px solid rgba(180,140,80,0.5);border-radius:4px;font:11px ui-monospace,monospace;cursor:pointer;';
  regShow.addEventListener('click', () => {
    window.__fvcmsShowOverlays();
  });
  const regHide = document.createElement('button');
  regHide.type = 'button';
  regHide.textContent = 'Hide';
  regHide.style.cssText = 'flex:0;padding:6px 10px;background:rgba(80,80,80,0.3);color:#fff;border:1px solid rgba(120,120,120,0.5);border-radius:4px;font:11px ui-monospace,monospace;cursor:pointer;';
  regHide.addEventListener('click', () => {
    window.__fvcmsHideOverlays();
  });
  regBtnRow.appendChild(regShow);
  regBtnRow.appendChild(regHide);
  regSec.appendChild(regBtnRow);

  const regHint = document.createElement('div');
  regHint.style.cssText = 'font-size:10px;color:#a0b0a0;margin-top:6px;line-height:1.4;';
  regHint.textContent = 'Each region becomes its own dockable panel — drag the header, dock to any edge, slim to a pill. No more CSS overlays.';
  regSec.appendChild(regHint);

  root.appendChild(regSec);

  // Group toggle
  const gtSec = document.createElement('div');
  gtSec.style.cssText = 'margin: 10px 0;';
  gtSec.innerHTML = '<div style="font-size:11px;color:#c0e0c0;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Group → Module</div>';
  gtSec.appendChild(renderGroupToggleUI());
  root.appendChild(gtSec);

  // Tip
  const tip = document.createElement('div');
  tip.style.cssText = 'font-size:10px;color:#a0b0a0;padding:8px;background:rgba(60,100,60,0.15);border-radius:4px;margin-top:14px;line-height:1.5;';
  tip.innerHTML = '<strong style="color:#c8e6c9">Tip</strong> — click any heading text on the page to edit inline. Drag pill to other edges. Touch-drag to re-dock.';
  root.appendChild(tip);

  return root;
}

// Update panel content whenever state changes
export function refreshCmsPanel() {
  if (!document.querySelector('[data-panel-id="' + PANEL_ID + '"]')) return;
  _refreshPanelContent();
}

// Focus a panel by id without going through activate() (which would
// collapse a panel that is already focused + active). Used by the
// CMS region headings to switch focus to a region panel.
function _focusPanel(panelId) {
  const mgr = (window.PanelManager || window.OscarPanelManager).get();
  const panel = mgr.panels[panelId];
  if (!panel) return;
  if (panel.state === 'hidden') {
    // Bootstrap: dock it to the right by default.
    mgr.dock(panelId, 'right');
    return;
  }
  if (panel.state === 'docked-collapsed') {
    // Bring it in to play.
    panel.state = 'docked-active';
  }
  // floating state stays as-is.
  mgr._setFocus(panel);
  mgr._renderPanelState(panel);
  // Re-render all docks so colours update
  Object.keys(mgr.docks).forEach((edge) => {
    const dock = mgr.docks[edge];
    if (dock) mgr._updateDockPills(dock);
  });

  // Page-level region highlight: when a region panel is focused,
  // scroll to that region and pin a yellow tag to its top-left.
  // Non-region panels (editor, cms) clear the highlight.
  if (panelId.startsWith('fvcms-region-')) {
    const regionId = panelId.replace('fvcms-region-', '');
    highlightRegion(regionId);
  } else {
    clearRegionHighlight();
  }
}

// Global API the panel-manager can re-render against
window.__fvcmsRefreshCmsPanel = refreshCmsPanel;

// Keyboard shortcut to enter dev mode from a clean state.
// Press the backtick (`) key, or Ctrl+Shift+D, to summon the
// { } button and the panel system. Press again to dismiss.
if (typeof window !== 'undefined' && !window.__fvcmsDevKeyBound) {
  window.__fvcmsDevKeyBound = true;
  window.addEventListener('keydown', function (ev) {
    // Skip if operator is typing in an input/textarea
    const tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const isToggleKey =
      ev.key === '`' ||
      (ev.ctrlKey && ev.shiftKey && (ev.key === 'D' || ev.key === 'd'));
    if (!isToggleKey) return;
    ev.preventDefault();
    if (typeof window.__fvcmsTogglePanel === 'function') {
      window.__fvcmsTogglePanel();
    }
  });
}