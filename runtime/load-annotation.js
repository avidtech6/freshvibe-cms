// runtime/load-annotation.js — load pre-built annotation into the store
// Use this at app boot instead of running detectElementor() at runtime
// (which would be slow and may have CORS issues fetching HTML).

import { getStore } from './store.js';

/**
 * Load annotation JSON into the store.
 *
 * @param {Object} annotation - the JSON object produced by scripts/annotate.js
 * @returns {Object} - {pages, regions, groups, modules} counts
 */
export function loadAnnotation(annotation) {
  if (!annotation || annotation.version !== 1) {
    console.warn('[freshvibe-cms] annotation version mismatch — got', annotation?.version, 'expected 1');
    return null;
  }
  const store = getStore();
  for (const page of annotation.pages || []) store.putPage(page);
  for (const region of annotation.regions || []) store.putRegion(region);
  for (const group of annotation.groups || []) store.putGroup(group);
  for (const m of annotation.modules || []) store.putModule(m);
  return {
    pages: annotation.pages?.length || 0,
    regions: annotation.regions?.length || 0,
    groups: annotation.groups?.length || 0,
    modules: annotation.modules?.length || 0,
  };
}

/**
 * Find the page in the annotation whose pathname matches the current URL.
 *
 * @param {Object} annotation
 * @param {string} pathname
 * @returns {Object|null}
 */
export function findPage(annotation, pathname) {
  return (annotation.pages || []).find(p => p.pathname === pathname) || null;
}