// demo/cms-panel.js — wires the FreshVibe CMS into the real panel manager.
// Reuses Oscar's panel manager behaviour verbatim — pills, drag, dock,
// smart minimise, full-height docked, no scrollbars, 6-dot grip,
// invisible dock on mobile.

import { getStore, getModuleDef } from '../runtime/index.js';
import { renderSkinPicker } from '../runtime/skin.js';
import { renderGroupToggleUI } from '../runtime/group-toggle.js';
import { showRegionOverlays, hideRegionOverlays } from '../runtime/visualizer.js';
import { openEditorShell } from '../runtime/editor-shell.js';
import './panel-bridge.css';

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

  // The toggle. If the panel is hidden/docked-collapsed/docked-active
  // → make it active. If active → minimise to pill. Honour smart
  // minimise when floating.
  window.__fvcmsTogglePanel = function () {
    const list = _mgr.list();
    const exists = list.panels.find(p => p.id === PANEL_ID);
    if (!exists) {
      _mgr.addPanel({
        id: PANEL_ID,
        title: 'FreshVibe CMS',
        content: document.createElement('div'),
        position: { x: 40, y: 80, w: 360, h: 520 },
      });
      _mgr.dock(PANEL_ID, 'left');
      _refreshPanelContent();
      return;
    }
    if (exists.state === 'docked-active') _mgr.collapse(PANEL_ID);
    else if (exists.state === 'floating') _mgr.dock(PANEL_ID, 'left');
    else if (exists.state === 'hidden') _mgr.dock(PANEL_ID, 'left');
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
  window.__fvcmsHighlightRegion = (regionId) => {
    const store = getStore();
    const region = store.getRegion(regionId);
    if (!region) return;
    const target = document.querySelector(region.selector);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return true;
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
    rHead.style.cssText = 'font-size:10px;color:#b0c0b0;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-top:8px;padding-top:6px;border-top:1px solid rgba(120,160,120,0.2);';
    rHead.textContent = region.label;
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

// Global API the panel-manager can re-render against
window.__fvcmsRefreshCmsPanel = refreshCmsPanel;