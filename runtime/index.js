// runtime/index.js — FreshVibe CMS runtime barrel
// Public API for consumers (Oscar's dist, future Shopify/Webflow, etc.)
//
// Usage:
//   import { initCms, loadAnnotation, getStore } from './runtime/index.js';
//   import annotation from './annotation.json';
//   await initCms();
//   loadAnnotation(annotation);
//
// The runtime does NOT contain the words "Elementor", "WordPress", etc.
// Stack-specific work happens in detectors/.

export { getStore, Store } from './store.js';
export { resolveScope, assertOp } from './scope.js';
export { loadAnnotation, findPage } from './load-annotation.js';
export { renderFormEditor } from './form-editor.js';
export { makeInlineEditable } from './inline-editor.js';
export {
  registerRenderer, connect, renderModule, renderAll, subscribeToStore
} from './renderer.js';
export {
  applySkin, registerSkin, renderSkinPicker, listSkins
} from './skin.js';
export {
  showRegionOverlays, hideRegionOverlays, isOverlaysActive, startOverlayTracking
} from './visualizer.js';
export { startOutlines, stopOutlines, isOutlinesActive, refreshOutlines } from './outline.js';
export { buildNavigator, mountNavigator, refreshNavigator } from './navigator.js';
export { renderGroupToggleUI, toggleGroupToModule } from './group-toggle.js';
export { openEditorShell } from './editor-shell.js';
export { openContextMenu, closeContextMenu, isContextMenuOpen } from './context-menu.js';
export { mountBreadcrumb, unmountBreadcrumb, isBreadcrumbMounted } from './breadcrumb.js';
export { renderRegion, renderAllRegions, applyRegionToStore, updateRegionConfig, subscribeRegionRenderer } from './region-renderer.js';
export { renderRegionEditor } from './region-editor.js';
export {
  registerConfigAdapter, populateConfigFromDOM, populateAll
} from './config-from-dom.js';
export { ensureDefaultAdapters } from './default-config-adapters.js';
export { getSelection } from './selection.js';

import { getStore } from './store.js';
import { CANONICAL_MODULES } from '../modules/index.js';

let _initialized = false;

export async function initCms() {
  if (_initialized) return;
  const store = getStore();
  await store.open();
  _initialized = true;
  return store;
}

export async function detectPage({ pathname, html, detect }) {
  const store = getStore();
  const result = detect({ pathname, html });

  for (const page of result.pages) store.putPage(page);
  for (const region of result.regions) store.putRegion(region);
  for (const group of result.groups) store.putGroup(group);
  for (const m of result.modules) store.putModule(m);

  const page = store.getPageByPathname(pathname);
  if (page) {
    store.setActivePage(page.id);
  }
  return result;
}

export function getCanonicalModules() {
  return CANONICAL_MODULES.slice();
}

export function getModuleDef(id) {
  if (!id) return null;
  // Match by id with or without 'M-' prefix (heading vs M-heading).
  const bare = id.replace(/^M-/, '');
  return CANONICAL_MODULES.find(m => m.id === id || m.id === 'M-' + bare || m.id === bare) || null;
}