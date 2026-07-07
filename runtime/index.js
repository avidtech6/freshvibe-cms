// runtime/index.js — FreshVibe CMS runtime barrel
// Public API for consumers (Oscar's dist, future Shopify/Webflow, etc.)
//
// Usage:
//   import { initCms, getStore, detectPage, resolveScope } from './runtime/index.js';
//   await initCms();
//   await detectPage({ pathname: '/', html: document.documentElement.outerHTML });
//
// The runtime does NOT contain the words "Elementor", "WordPress", etc.
// Stack-specific work happens in detectors/.

export { getStore, Store } from './store.js';
export { resolveScope, assertOp } from './scope.js';

import { getStore } from './store.js';
import { CANONICAL_MODULES } from '../modules/index.js';

let _initialized = false;

export async function initCms() {
  if (_initialized) return;
  const store = getStore();
  await store.open();
  // Register canonical module library in store
  for (const def of CANONICAL_MODULES) {
    // moduleDefs aren't stored in IndexedDB — they're loaded from code
    // But we expose them via the context for editor UI to render forms.
  }
  _initialized = true;
  return store;
}

/**
 * Run a detector on a page's HTML and persist the annotation.
 * The detector is stack-specific; the runtime does the persistence.
 *
 * @param {Object} opts
 * @param {string} opts.pathname
 * @param {string} opts.html
 * @param {Function} opts.detect - a detector function ({pathname, html}) => AnnotationResult
 */
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