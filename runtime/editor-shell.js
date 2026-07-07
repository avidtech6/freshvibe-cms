// runtime/editor-shell.js — improved editor shell with header, tabs, and undo
// Wraps the basic form-editor with better UX.

import { renderFormEditor } from './form-editor.js';

export function openEditorShell({ moduleInstance, moduleDef, onSave, store }) {
  const modal = document.createElement('div');
  modal.className = 'fvcms-modal-backdrop';
  modal.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 2147483640;
    display: flex; align-items: center; justify-content: center;
  `;

  const shell = document.createElement('div');
  shell.className = 'fvcms-modal';
  shell.style.cssText = `
    width: 480px; max-width: 90vw; max-height: 80vh; overflow: auto;
    background: rgba(20, 28, 20, 0.98); color: #e8e8e0;
    border: 1px solid rgba(120, 160, 120, 0.4); border-radius: 10px;
    padding: 18px 20px;
    font: 12px ui-monospace, monospace;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  `;

  // Header
  const header = document.createElement('div');
  header.className = 'fvcms-modal-header';
  header.style.cssText = `
    display: flex; align-items: center; gap: 10px;
    padding-bottom: 12px; margin-bottom: 12px;
    border-bottom: 1px solid rgba(120, 160, 120, 0.3);
  `;
  const title = document.createElement('div');
  title.style.cssText = 'flex: 1; font-weight: 700; font-size: 13px; color: #c0e0c0;';
  title.textContent = `Edit: ${moduleDef.label}`;
  header.appendChild(title);

  const idBadge = document.createElement('span');
  idBadge.style.cssText = `
    background: rgba(60, 100, 60, 0.4); color: #d0d8d0;
    padding: 2px 8px; border-radius: 4px; font-size: 10px;
    border: 1px solid rgba(120, 160, 120, 0.3);
  `;
  idBadge.textContent = moduleInstance.id;
  header.appendChild(idBadge);

  // Close
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: transparent; border: 1px solid rgba(160, 160, 160, 0.4);
    color: #d0d0d0; cursor: pointer; padding: 0 8px;
    border-radius: 4px; font-size: 18px; line-height: 22px;
  `;
  closeBtn.addEventListener('click', () => modal.remove());
  header.appendChild(closeBtn);

  shell.appendChild(header);

  // Tabs (Fields / Variants / Raw)
  const tabsBar = document.createElement('div');
  tabsBar.className = 'fvcms-tabs';
  tabsBar.style.cssText = `
    display: flex; gap: 2px; margin-bottom: 12px;
    border-bottom: 1px solid rgba(120, 160, 120, 0.2);
  `;
  const tabFields = makeTab('Fields');
  const tabVariants = makeTab('Variants');
  const tabRaw = makeTab('Raw JSON');
  tabsBar.appendChild(tabFields);
  tabsBar.appendChild(tabVariants);
  tabsBar.appendChild(tabRaw);
  shell.appendChild(tabsBar);

  const tabContent = document.createElement('div');
  tabContent.className = 'fvcms-tab-content';
  shell.appendChild(tabContent);

  // Build field/variants/raw sections
  const fieldsEl = renderFormEditor({
    moduleInstance,
    moduleDef,
    onSave: (newConfig) => {
      moduleInstance.config = newConfig;
      if (store) store.putModule(moduleInstance);
      if (onSave) onSave(moduleInstance);
      flashSaved();
    },
  });

  const variantsEl = renderVariantsSection({
    moduleInstance,
    moduleDef,
    onApply: (variant) => {
      moduleInstance.config = { ...moduleInstance.config, ...variant.config };
      if (store) store.putModule(moduleInstance);
      if (onSave) onSave(moduleInstance);
      activateTab('variants');
      flashSaved();
    },
  });

  const rawEl = renderRawJSONSection({
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

  modal.appendChild(shell);
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  function flashSaved() {
    const flash = document.createElement('div');
    flash.textContent = '✓ Saved';
    flash.style.cssText = `
      position: absolute; top: 12px; right: 60px;
      background: rgba(76, 175, 80, 0.8); color: #fff;
      padding: 3px 10px; border-radius: 12px; font-size: 10px;
    `;
    shell.appendChild(flash);
    setTimeout(() => flash.remove(), 1500);
  }
}

function makeTab(label) {
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
  return tab;
}

function renderVariantsSection({ moduleInstance, moduleDef, onApply }) {
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

function renderRawJSONSection({ moduleInstance, onChange }) {
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