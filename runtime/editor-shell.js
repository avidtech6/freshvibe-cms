// runtime/editor-shell.js — editor panel for a single module instance.
//
// Opens as a PanelManager panel docked to the right edge. Subscribes
// to FreshVibeCmsSelection so it auto-opens when a module is selected
// (via outline tag, navigator click, or any other selector).
//
// Per app-fragments/editor-inspector/fragment.md.
// Per app-pact §3.1 Layer A: this file MUST NOT contain framework names.
// Per app-pact §3.4: this file touches only its own panel DOM.
// Per app-pact §3.6: uses PanelManager singleton for all overlay chrome.

import { renderFormEditor } from './form-editor.js';
import { getStore } from './store.js';
import { getModuleDef } from './index.js';
import { getSelection } from './selection.js';

const PANEL_PREFIX = 'fvcms-edit-';

function panelIdFor(moduleInstance) {
  return PANEL_PREFIX + moduleInstance.id;
}

function getPanelManager() {
  if (typeof window === 'undefined') return null;
  return window.PanelManager || window.OscarPanelManager || null;
}

function getPanelManagerInstance() {
  const api = getPanelManager();
  if (!api) return null;
  return api.get ? api.get() : null;
}

let _selectionUnsub = null;
let _editorStores = new WeakMap();   // panelId → { store, onSave, moduleDef }

/**
 * Open (or focus) an editor panel for a module instance.
 *
 * If the panel already exists, reactivate it on the existing edge.
 * If it doesn't, create it docked-active on the right edge.
 */
export function openEditorShell({ moduleInstance, moduleDef, onSave, store }) {
  const api = getPanelManager();
  if (!api) {
    console.warn('[fvcms] PanelManager not available; cannot open editor panel.');
    return null;
  }
  let mgr = api.get();
  if (!mgr) {
    api.create();
    mgr = api.get();
    if (!mgr) return null;
  }

  const id = panelIdFor(moduleInstance);
  const existing = mgr.list().panels.find(p => p.id === id);

  if (existing) {
    _refreshContent(existing, { moduleInstance, moduleDef, onSave, store });
    mgr.activate(id);
    return existing;
  }

  // Build the body. The body is the entire editor — header is added
  // by the panel manager itself.
  const body = document.createElement('div');
  body.className = 'fvcms-editor-body';
  body.dataset.moduleId = moduleInstance.id;
  body.dataset.moduleType = moduleDef.id;
  _renderTabsInto(body, { moduleInstance, moduleDef, onSave, store, mgr, panelId: id });

  mgr.addPanel({
    id,
    title: `Edit: ${moduleDef.label}`,
    content: body,
    position: { x: 60, y: 80, w: 360, h: 520 },
  });
  mgr.dock(id, 'right');

  const panel = mgr.list().panels.find(p => p.id === id);
  if (panel) _editorStores.set(panel, { store, onSave, moduleDef });
  return panel;
}

/**
 * Close the editor for a given moduleId. Idempotent — no-op if no panel exists.
 */
export function closeEditorShell(moduleId) {
  const api = getPanelManager();
  if (!api) return;
  const mgr = getPanelManagerInstance();
  if (!mgr) return;
  const panelId = PANEL_PREFIX + moduleId;
  const panel = mgr.list().panels.find(p => p.id === panelId);
  if (panel) {
    // Panel manager exposes close() in some versions, removePanel() in others.
    if (typeof mgr.close === 'function') mgr.close(panelId);
    else if (typeof mgr.removePanel === 'function') mgr.removePanel(panelId);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fvcms:editor-closed', { detail: { moduleId } }));
  }
}

function _refreshContent(panel, ctx) {
  const root = document.querySelector('.fvcms-pm-panel[data-panel-id="' + panel.id + '"]');
  if (!root) return;
  const body = root.querySelector('.fvcms-pm-body');
  if (!body) return;
  body.innerHTML = '';
  const fresh = document.createElement('div');
  fresh.className = 'fvcms-editor-body';
  fresh.dataset.moduleId = ctx.moduleInstance.id;
  fresh.dataset.moduleType = ctx.moduleDef.id;
  body.appendChild(fresh);
  panel.content = fresh;
  _renderTabsInto(fresh, ctx);
}

function _renderTabsInto(body, ctx) {
  const { moduleInstance, moduleDef, onSave, store, mgr, panelId } = ctx;

  const status = document.createElement('div');
  status.className = 'fvcms-editor-status';
  const idLabel = document.createElement('span');
  idLabel.className = 'fvcms-editor-id';
  idLabel.textContent = `${moduleDef.label} · ${moduleInstance.id}`;
  status.appendChild(idLabel);
  const flash = document.createElement('span');
  flash.className = 'fvcms-editor-flash';
  status.appendChild(flash);
  body.appendChild(status);

  const tabsBar = document.createElement('div');
  tabsBar.className = 'fvcms-editor-tabs';

  const tabFields = _makeTab('Fields');
  const tabVariants = _makeTab('Variants');
  const tabRaw = _makeTab('Raw JSON');
  tabsBar.appendChild(tabFields);
  tabsBar.appendChild(tabVariants);
  tabsBar.appendChild(tabRaw);
  body.appendChild(tabsBar);

  const tabContent = document.createElement('div');
  tabContent.className = 'fvcms-editor-tab-content';
  body.appendChild(tabContent);

  const showSaved = function () {
    flash.textContent = '✓ Saved';
    flash.style.opacity = '1';
    setTimeout(() => { flash.style.opacity = '0'; }, 1400);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fvcms:editor-saved', {
        detail: { moduleId: moduleInstance.id, config: moduleInstance.config },
      }));
    }
  };

  const fieldsEl = renderFormEditor({
    moduleInstance,
    moduleDef,
    onSave: (newConfig) => {
      moduleInstance.config = newConfig;
      if (store) store.putModule(moduleInstance);
      if (onSave) onSave(moduleInstance);
      showSaved();
    },
  });

  const variantsEl = _renderVariantsSection({
    moduleInstance,
    moduleDef,
    onApply: (variant) => {
      moduleInstance.config = { ...moduleInstance.config, ...variant.config };
      if (store) store.putModule(moduleInstance);
      if (onSave) onSave(moduleInstance);
      activateTab('variants');
      showSaved();
    },
  });

  const rawEl = _renderRawJSONSection({
    moduleInstance,
    onChange: (parsedConfig) => {
      moduleInstance.config = parsedConfig;
      if (store) store.putModule(moduleInstance);
      if (onSave) onSave(moduleInstance);
    },
  });

  function activateTab(name) {
    tabFields.classList.toggle('fvcms-tab-active', name === 'fields');
    tabVariants.classList.toggle('fvcms-tab-active', name === 'variants');
    tabRaw.classList.toggle('fvcms-tab-active', name === 'raw');
    while (tabContent.firstChild) tabContent.removeChild(tabContent.firstChild);
    if (name === 'fields') tabContent.appendChild(fieldsEl);
    else if (name === 'variants') tabContent.appendChild(variantsEl);
    else tabContent.appendChild(rawEl);
  }
  tabFields.addEventListener('click', () => activateTab('fields'));
  tabVariants.addEventListener('click', () => activateTab('variants'));
  tabRaw.addEventListener('click', () => activateTab('raw'));

  activateTab('fields');
}

function _makeTab(label) {
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.textContent = label;
  tab.className = 'fvcms-editor-tab';
  tab.addEventListener('click', () => {
    tab.dispatchEvent(new CustomEvent('fvcms-tab-click', { bubbles: false }));
  });
  return tab;
}

function _renderVariantsSection({ moduleInstance, moduleDef, onApply }) {
  const root = document.createElement('div');
  root.className = 'fvcms-editor-variants';
  if (!moduleDef.variants || moduleDef.variants.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fvcms-editor-empty';
    empty.textContent = '(no variants for this module type)';
    root.appendChild(empty);
    return root;
  }
  for (const variant of moduleDef.variants) {
    const row = document.createElement('div');
    row.className = 'fvcms-variant-row';

    const label = document.createElement('div');
    label.className = 'fvcms-variant-label';
    label.textContent = variant.label;
    row.appendChild(label);

    const preview = document.createElement('div');
    preview.className = 'fvcms-variant-preview';
    preview.textContent = JSON.stringify(variant.config);
    row.appendChild(preview);

    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'fvcms-variant-apply';
    apply.textContent = 'Apply';
    apply.addEventListener('click', () => onApply(variant));
    row.appendChild(apply);

    root.appendChild(row);
  }
  return root;
}

function _renderRawJSONSection({ moduleInstance, onChange }) {
  const root = document.createElement('div');
  root.className = 'fvcms-editor-raw';
  const textarea = document.createElement('textarea');
  textarea.className = 'fvcms-editor-raw-textarea';
  textarea.value = JSON.stringify(moduleInstance.config, null, 2);
  let timer = null;
  textarea.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(textarea.value);
        onChange(parsed);
        textarea.classList.remove('fvcms-editor-raw-invalid');
      } catch {
        textarea.classList.add('fvcms-editor-raw-invalid');
      }
    }, 300);
  });
  root.appendChild(textarea);
  return root;
}

// Selection-driven auto-open. Subscribe to selection; when a module
// is selected, look it up in the store and open the editor panel.
// Idempotent — re-selecting the same module just focuses.
export function _startSelectionAutoOpen() {
  if (_selectionUnsub) return;  // already started
  const sel = getSelection();
  _selectionUnsub = sel.onChange((current, prev) => {
    if (!current || current.kind !== 'module') return;
    const store = getStore();
    if (!store || !store.modules) return;
    let moduleInstance = null;
    if (store.modules.get) {
      moduleInstance = store.modules.get(current.id);
    } else if (store.modules.values) {
      for (const m of store.modules.values()) {
        if (m.id === current.id) { moduleInstance = m; break; }
      }
    }
    if (!moduleInstance) return;
    const moduleDef = getModuleDef(moduleInstance.moduleId || moduleInstance.moduleType);
    if (!moduleDef) return;
    openEditorShell({
      moduleInstance,
      moduleDef,
      store,
      onSave: (m) => {
        // Trigger Stage F render via the store's putModule already wired in renderer.js
        if (store && store.putModule) store.putModule(m);
      },
    });
  });
}

export function _stopSelectionAutoOpen() {
  if (_selectionUnsub) {
    _selectionUnsub();
    _selectionUnsub = null;
  }
}