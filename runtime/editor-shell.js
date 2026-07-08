// runtime/editor-shell.js — editor for a single module instance.
//
// The editor is a PanelManager panel — exactly the same shape as the
// CMS panel and the region panels. Same header (← / − / ⋮⋮ / ×),
// same dock/drag/slim-pill behaviour, same resize handle, same
// full-height docked-active state, same multi-panel stacking.
//
// No backdrop. No modal positioning. No special CSS. The panel
// manager handles everything.

import { renderFormEditor } from './form-editor.js';

const PANEL_PREFIX = 'fvcms-edit-';

function panelIdFor(moduleInstance) {
  return PANEL_PREFIX + moduleInstance.id;
}

/**
 * Open (or focus) an editor panel for a module instance.
 *
 * If the panel already exists, reactivate it on the existing edge.
 * If it doesn't, create it docked-active on the right edge (opposite
 * the CMS panel which usually lives on the left).
 */
export function openEditorShell({ moduleInstance, moduleDef, onSave, store }) {
  const api = (typeof window !== 'undefined')
    ? (window.PanelManager || window.OscarPanelManager)
    : null;
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
    // Already exists — bring it back. Re-render content in case the
    // store has a newer copy of the module.
    _refreshContent(existing, { moduleInstance, moduleDef, onSave, store });
    if (existing.state === 'docked-active') mgr.collapse(id); // collapse-then-activate to give visual feedback
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
    position: { x: 60, y: 80, w: 480, h: 540 },
  });
  // dock() already sets state='docked-active' and focuses the panel.
  // Don't call activate() afterwards — it would see
  // docked-active + isFocused and call collapse() on the
  // freshly-opened panel (hiding it instead of showing it).
  mgr.dock(id, 'right');

  return mgr.list().panels.find(p => p.id === id);
}

function _refreshContent(panel, ctx) {
  // Find the panel's body in the DOM and re-render into it.
  const root = document.querySelector('.fvcms-pm-panel[data-panel-id="' + panel.id + '"]');
  if (!root) return;
  const body = root.querySelector('.fvcms-pm-body');
  if (!body) return;
  body.innerHTML = '';
  // Replace panel.content with a fresh body element so future renders
  // also operate on the latest content.
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

  // Status line
  const status = document.createElement('div');
  status.className = 'fvcms-editor-status';
  status.style.cssText = `
    font-size: 11px; color: #b0c0b0; margin-bottom: 10px;
    display: flex; align-items: center; gap: 8px;
  `;
  const idLabel = document.createElement('span');
  idLabel.textContent = `${moduleDef.label} · ${moduleInstance.id}`;
  idLabel.style.cssText = 'flex: 1;';
  status.appendChild(idLabel);
  const flash = document.createElement('span');
  flash.className = 'fvcms-editor-flash';
  flash.style.cssText = 'color: #80c080; font-size: 10px; opacity: 0; transition: opacity 0.2s;';
  status.appendChild(flash);
  body.appendChild(status);

  // Tabs
  const tabsBar = document.createElement('div');
  tabsBar.style.cssText = `
    display: flex; gap: 2px; margin-bottom: 12px;
    border-bottom: 1px solid rgba(120, 160, 120, 0.2);
  `;
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
    tabContent.innerHTML = '';
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
  tab.style.cssText = `
    flex: 0 0 auto;
    background: transparent; color: #b0c0b0; border: none;
    padding: 6px 14px; cursor: pointer;
    border-bottom: 2px solid transparent;
    font: 11px ui-monospace, monospace;
  `;
  tab.addEventListener('click', () => {
    tab.dispatchEvent(new CustomEvent('fvcms-tab-click', { bubbles: false }));
  });
  return tab;
}

function _renderVariantsSection({ moduleInstance, moduleDef, onApply }) {
  const root = document.createElement('div');
  if (!moduleDef.variants || moduleDef.variants.length === 0) {
    root.textContent = '(no variants for this module type)';
    root.style.color = '#888';
    return root;
  }
  for (const variant of moduleDef.variants) {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; margin: 4px 0;
      background: rgba(60, 100, 60, 0.3);
      border: 1px solid rgba(120, 160, 120, 0.3);
      border-radius: 6px;
    `;
    const label = document.createElement('div');
    label.style.cssText = 'flex: 1;';
    label.textContent = variant.label;
    row.appendChild(label);
    const preview = document.createElement('div');
    preview.style.cssText = 'font-size: 10px; color: #b0c0b0; font-family: monospace; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    preview.textContent = JSON.stringify(variant.config);
    row.appendChild(preview);
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.textContent = 'Apply';
    apply.style.cssText = `
      background: rgba(180, 140, 80, 0.7); color: #fff;
      border: none; padding: 4px 12px; border-radius: 4px;
      cursor: pointer; font: 11px ui-monospace, monospace;
    `;
    apply.addEventListener('click', () => onApply(variant));
    row.appendChild(apply);
    root.appendChild(row);
  }
  return root;
}

function _renderRawJSONSection({ moduleInstance, onChange }) {
  const root = document.createElement('div');
  const textarea = document.createElement('textarea');
  textarea.style.cssText = `
    width: 100%; height: 320px;
    background: rgba(0, 0, 0, 0.4); color: #e8e8e0;
    border: 1px solid rgba(120, 160, 120, 0.3);
    border-radius: 4px; padding: 8px;
    font: 11px ui-monospace, monospace;
    box-sizing: border-box;
  `;
  textarea.value = JSON.stringify(moduleInstance.config, null, 2);
  let timer = null;
  textarea.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(textarea.value);
        onChange(parsed);
        textarea.style.borderColor = 'rgba(120, 160, 120, 0.3)';
      } catch {
        textarea.style.borderColor = 'rgba(255, 80, 80, 0.7)';
      }
    }, 300);
  });
  root.appendChild(textarea);
  return root;
}