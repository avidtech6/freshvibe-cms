// bootstrap.js — entry point that wires FreshVibe CMS into a host site
// Designed to be loaded from any page that wants the CMS enabled.
//
// Usage in HTML:
//   <script type="module">
//     import './bootstrap.js';
//   </script>
//
// Or imported by another module like oscar-dev-panel.js.
//
// What this does:
//  1. Initialize the IndexedDB store
//  2. Load annotation JSON (must be served alongside the page)
//  3. Mount the region navigator into the existing dev panel (if present)
//  4. Wire inline text editing on detected module text elements
//  5. Expose __fvcmsOpenEditor(id) so any badge/click can open a module editor

import { initCms, getStore, resolveScope, getModuleDef } from './runtime/index.js';
import { renderFormEditor } from './runtime/form-editor.js';
import { makeInlineEditable } from './runtime/inline-editor.js';
import './runtime/styles.css';

let _annotation = null;

export async function bootFreshvibeCms({ annotation, annotationUrl, host } = {}) {
  await initCms();

  if (!annotation && annotationUrl) {
    const resp = await fetch(annotationUrl);
    annotation = await resp.json();
  }
  if (!annotation) {
    console.warn('[fvcms] no annotation provided');
    return;
  }
  _annotation = annotation;

  const { loadAnnotation, findPage } = await import('./runtime/load-annotation.js');
  loadAnnotation(annotation);

  const store = getStore();
  const pathname = location.pathname;
  const page = findPage(annotation, pathname);
  if (!page) {
    console.info('[fvcms] no annotation for', pathname);
    return;
  }
  store.setActivePage(page.id);

  // Wire inline editing for text fields in heading modules on this page.
  wireInlineEditors(page);

  // Wire navigator into host (if host provided).
  if (host && typeof host.mountNavigator === 'function') {
    host.mountNavigator(buildNavigatorForPage(page));
  }

  // Expose global openEditor for badge clicks etc.
  window.__fvcmsOpenEditor = openModuleEditor;

  console.info(`[fvcms] booted — ${page.regionIds.length} regions on this page`);
}

function buildNavigatorForPage(page) {
  const store = getStore();
  const regions = store.listRegionsForPage(page.id);
  const root = document.createElement('div');
  root.className = 'fvcms-navigator';
  for (const region of regions) {
    const regionEl = document.createElement('div');
    regionEl.className = 'fvcms-nav-region';
    const labelEl = document.createElement('div');
    labelEl.className = 'fvcms-nav-region-label';
    labelEl.textContent = region.label || region.id;
    regionEl.appendChild(labelEl);
    for (const group of store.listGroupsForRegion(region.id)) {
      const groupEl = document.createElement('div');
      groupEl.className = 'fvcms-nav-group';
      const modules = store.listModulesForGroup(group.id);
      for (const m of modules) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fvcms-nav-module';
        btn.textContent = m.id.replace(/^MI-/, '');
        btn.title = m.moduleId;
        btn.addEventListener('click', () => openModuleEditor(m.id));
        groupEl.appendChild(btn);
      }
      regionEl.appendChild(groupEl);
    }
    root.appendChild(regionEl);
  }
  return root;
}

function openModuleEditor(moduleInstanceId) {
  const store = getStore();
  const m = store.getModule(moduleInstanceId);
  if (!m) return;
  const def = getModuleDef(m.moduleId);
  if (!def) {
    alert(`No canonical module found for "${m.moduleId}".\nThis widget type isn't in the library yet.`);
    return;
  }
  // Use the existing dev panel if available
  const devPanel = document.querySelector('[data-panel-id="oscar-dev-panel"]');
  if (devPanel) {
    const body = devPanel.querySelector('.oscar-pm-body');
    if (body) {
      body.innerHTML = '';
      const header = document.createElement('div');
      header.style.cssText = 'font-size:11px;color:#b0c0b0;margin-bottom:8px;';
      header.textContent = `Editing: ${def.label} (${m.id})`;
      body.appendChild(header);
      const editor = renderFormEditor({
        moduleInstance: m,
        moduleDef: def,
        onSave: (newConfig) => {
          store.updateField(m.id, '__replace__', newConfig);
          // updateField only sets one field; do a full replace
          const stored = store.getModule(m.id);
          stored.config = newConfig;
          store.putModule(stored);
          console.info('[fvcms] saved', m.id);
        },
      });
      body.appendChild(editor);
    }
  } else {
    // Open in a modal
    openEditorModal(m, def, store);
  }
}

function openEditorModal(m, def, store) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: rgba(20, 28, 20, 0.97); color: #e8e8e0;
    padding: 20px; border-radius: 10px;
    border: 1px solid rgba(120, 160, 120, 0.3);
    z-index: 2147483647; max-width: 480px; max-height: 80vh; overflow: auto;
    font: 12px ui-monospace, monospace;
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  `;
  const close = document.createElement('button');
  close.textContent = '×';
  close.style.cssText = `
    position: absolute; top: 6px; right: 10px;
    background: transparent; border: none; color: #fff; cursor: pointer;
    font-size: 22px; line-height: 1;
  `;
  close.addEventListener('click', () => modal.remove());
  modal.appendChild(close);
  const editor = renderFormEditor({
    moduleInstance: m,
    moduleDef: def,
    onSave: (newConfig) => {
      const stored = store.getModule(m.id);
      stored.config = newConfig;
      store.putModule(stored);
    },
  });
  modal.appendChild(editor);
  document.body.appendChild(modal);
}

function wireInlineEditors(page) {
  const store = getStore();
  for (const regionId of page.regionIds) {
    for (const group of store.listGroupsForRegion(regionId)) {
      for (const m of store.listModulesForGroup(group.id)) {
        if (m.moduleId !== 'M-heading') continue;
        const el = document.querySelector(m.selector);
        if (!el) continue;
        // Find the actual heading element inside
        const headingEl = el.querySelector('h1, h2, h3, h4, h5, h6') || el;
        makeInlineEditable({
          el: headingEl,
          moduleInstanceId: m.id,
          fieldName: 'text',
        });
      }
    }
  }
}