// runtime/visualizer.js — region panels
// Each region becomes a PanelManager panel. The panel manager handles
// everything (drag, dock, slim pill, header buttons, full-height dock,
// scroll-aware resize). Region visuals are JUST the panel + the
// existing region element on the page — no parallel CSS overlay system.

import { getStore } from './store.js';
import { renderRegionEditor } from './region-editor.js';

const PANEL_PREFIX = 'fvcms-region-';

export function regionPanelId(regionId) {
  return PANEL_PREFIX + regionId;
}

/**
 * Spawn one PanelManager panel per region. Each panel uses the
 * region-editor as its body. Existing panels are re-shown if hidden.
 */
export function showRegionOverlays() {
  const api = window.PanelManager || window.OscarPanelManager;
  if (!api) return;

  const store = getStore();
  const page = store.getPage(store.activeContext.page);
  if (!page) return;

  // Lazy-create the panel manager singleton
  let mgr = api.get();
  if (!mgr) {
    api.create();
    mgr = api.get();
    if (!mgr) return;
  }

  for (const regionId of page.regionIds) {
    const region = store.getRegion(regionId);
    if (!region) continue;
    const panelId = regionPanelId(regionId);
    const existing = mgr.list().panels.find(p => p.id === panelId);

    if (!existing) {
      const content = buildRegionContent(regionId);
      mgr.addPanel({
        id: panelId,
        title: region.label || regionId,
        content,
        position: { x: 60, y: 80, w: 360, h: 520 },
      });
      mgr.dock(panelId, 'left');
    } else if (existing.state === 'hidden') {
      mgr.dock(panelId, 'left');
    } else if (existing.state === 'docked-collapsed') {
      mgr.activate(panelId);
    }
    // If already docked-active or floating, leave as-is.
  }
}

/**
 * Collapse all region panels to slim pills.
 */
export function hideRegionOverlays() {
  const api = window.PanelManager || window.OscarPanelManager;
  if (!api) return;
  const mgr = api.get();
  if (!mgr) return;

  const store = getStore();
  const page = store.getPage(store.activeContext.page);
  if (!page) return;
  for (const regionId of page.regionIds) {
    const panelId = regionPanelId(regionId);
    const p = mgr.list().panels.find(x => x.id === panelId);
    if (p && p.state === 'docked-active') mgr.collapse(panelId);
  }
}

export function isOverlaysActive() {
  const api = window.PanelManager || window.OscarPanelManager;
  if (!api) return false;
  const mgr = api.get();
  if (!mgr) return false;
  const store = getStore();
  const page = store.getPage(store.activeContext.page);
  if (!page) return false;
  return page.regionIds.some(id => {
    const p = mgr.list().panels.find(x => x.id === regionPanelId(id));
    return p && p.state !== 'hidden';
  });
}

/**
 * Backwards-compat: some callers expect startOverlayTracking() to exist.
 * The panel manager doesn't need an explicit kick — it auto-tracks
 * everything via its own scroll/resize handlers. We keep the symbol
 * so existing call sites don't break.
 */
export function startOverlayTracking() {
  /* no-op: panel-manager already handles scroll/resize automatically */
}

// Build the content shown inside a region's docked panel
function buildRegionContent(regionId) {
  const root = document.createElement('div');
  root.className = 'fvcms-region-panel-content';
  root.dataset.regionId = regionId;

  const store = getStore();
  const region = store.getRegion(regionId);

  // Region metadata header
  if (region) {
    const meta = document.createElement('div');
    meta.className = 'fvcms-region-meta';
    const groups = store.listGroupsForRegion(regionId);
    const totalModules = groups.reduce(
      (sum, g) => sum + store.listModulesForGroup(g.id).length, 0);
    meta.innerHTML = `
      <div style="font-size:11px;color:#b0c0b0;margin-bottom:8px;">
        ${groups.length} group${groups.length === 1 ? '' : 's'} ·
        ${totalModules} module${totalModules === 1 ? '' : 's'}
      </div>
    `;
    root.appendChild(meta);
  }

  // Jump-to-region button
  if (region) {
    const jumpBtn = document.createElement('button');
    jumpBtn.type = 'button';
    jumpBtn.className = 'fvcms-region-jump';
    jumpBtn.textContent = 'Jump to region on page';
    jumpBtn.style.cssText = `
      width: 100%; padding: 6px 10px; margin-bottom: 12px;
      background: rgba(76, 152, 175, 0.4); color: #fff;
      border: 1px solid rgba(120, 200, 200, 0.5); border-radius: 4px;
      font: 11px ui-monospace, monospace; cursor: pointer;
    `;
    jumpBtn.addEventListener('click', () => {
      const target = document.querySelector(region.selector);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    root.appendChild(jumpBtn);
  }

  // Region styles editor (the same form as before — reused across panels)
  root.appendChild(renderRegionEditor());

  return root;
}