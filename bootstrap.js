// bootstrap.js — entry point that wires FreshVibe CMS into a host site
// v0.3: skins + group toggle + visualizer + improved editor shell

import { initCms, getStore, resolveScope, getModuleDef } from './runtime/index.js';
import { renderFormEditor } from './runtime/form-editor.js';
import { makeInlineEditable } from './runtime/inline-editor.js';
import { subscribeToStore, renderModule, connect } from './runtime/renderer.js';
import { applySkin, registerSkin, renderSkinPicker } from './runtime/skin.js';
import { showRegionOverlays, hideRegionOverlays, startOverlayTracking } from './runtime/visualizer.js';
import { renderGroupToggleUI, toggleGroupToModule } from './runtime/group-toggle.js';
import { openEditorShell } from './runtime/editor-shell.js';
import { SAMPLE_SKINS } from './skins/index.js';
import './runtime/styles.css';

let _annotation = null;

export async function bootFreshvibeCms({ annotation, annotationUrl, host, registerSampleSkins = true } = {}) {
  await initCms();

  // Register sample skins
  if (registerSampleSkins) {
    for (const skin of SAMPLE_SKINS) registerSkin(skin);
  }

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

  // Connect each module instance to its DOM element so the renderer
  // can re-render it when config changes.
  for (const regionId of page.regionIds) {
    for (const group of store.listGroupsForRegion(regionId)) {
      if (!group.isModule || !group.moduleInstanceId) continue;
      const el = document.querySelector(group.selector);
      if (el) connect(group.moduleInstanceId, el);
    }
  }

  // Wire inline editing for text fields on heading modules.
  wireInlineEditors(page);

  // Subscribe renderer to store changes (auto re-render on edit)
  subscribeToStore();

  // Start overlay tracking for region visualisation.
  startOverlayTracking();

  // Wire navigator into host (if host provided).
  if (host && typeof host.mountNavigator === 'function') {
    host.mountNavigator(buildNavigatorForPage(page));
  }

  // Expose globals for badge clicks etc.
  window.__fvcmsOpenEditor = openModuleEditor;
  window.__fvcmsShowOverlays = showRegionOverlays;
  window.__fvcmsHideOverlays = hideRegionOverlays;
  window.__fvcmsApplySkin = applySkin;
  window.__fvcmsHighlightRegion = (regionId) => {
    const region = store.getRegion(regionId);
    if (!region) return;
    const target = document.querySelector(region.selector);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  window.__fvcmsRenderGroupToggle = () => renderGroupToggleUI();

  console.info(`[fvcms v0.3] booted — ${page.regionIds.length} regions on this page`);
}

function buildNavigatorForPage(page) {
  const store = getStore();
  const root = document.createElement('div');
  root.className = 'fvcms-navigator';

  // Skin picker
  root.appendChild(renderSkinPicker());

  // Overlays toggle
  const overlayToggle = document.createElement('div');
  overlayToggle.style.cssText = 'display: flex; gap: 6px; padding: 4px 0;';
  const onBtn = document.createElement('button');
  onBtn.textContent = 'Show regions';
  onBtn.style.cssText = btn();
  onBtn.addEventListener('click', () => { showRegionOverlays(); onBtn.style.opacity = 0.5; offBtn.style.opacity = 1; });
  const offBtn = document.createElement('button');
  offBtn.textContent = 'Hide regions';
  offBtn.style.cssText = btn();
  offBtn.addEventListener('click', () => { hideRegionOverlays(); offBtn.style.opacity = 0.5; onBtn.style.opacity = 1; });
  overlayToggle.appendChild(onBtn);
  overlayToggle.appendChild(offBtn);
  root.appendChild(overlayToggle);

  // Group toggle panel
  const groupToggleRoot = renderGroupToggleUI();
  root.appendChild(groupToggleRoot);

  // Region tree with module buttons
  const tree = document.createElement('div');
  tree.className = 'fvcms-nav-tree';
  const regions = store.listRegionsForPage(page.id);
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
    tree.appendChild(regionEl);
  }
  root.appendChild(tree);

  return root;
}

function btn() {
  return `
    background: rgba(60, 100, 60, 0.4); color: #e8e8e0;
    border: 1px solid rgba(120, 160, 120, 0.3);
    border-radius: 4px; padding: 4px 10px;
    font: 11px ui-monospace, monospace; cursor: pointer;
    flex: 1;
  `;
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
  // Use the existing dev panel if available (legacy mode)
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
          m.config = newConfig;
          store.putModule(m);
        },
      });
      body.appendChild(editor);
      return;
    }
  }
  // Standalone modal with full shell
  openEditorShell({ moduleInstance: m, moduleDef: def, store });
}

function wireInlineEditors(page) {
  const store = getStore();
  for (const regionId of page.regionIds) {
    for (const group of store.listGroupsForRegion(regionId)) {
      for (const m of store.listModulesForGroup(group.id)) {
        if (m.moduleId !== 'M-heading') continue;
        const el = document.querySelector(m.selector);
        if (!el) continue;
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