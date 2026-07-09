// runtime/config-from-dom.js — generic config-from-DOM plugin.
//
// When a module's config is empty (because the host site / framework
// did not serialise the values into data-settings, or the detector
// runs on cached HTML without inline config), the runtime can call
// each module's "populate from DOM" adapter to read the actual values
// out of the live DOM.
//
// The default behaviour: do nothing. Host apps (or detectors) register
// adapters per canonical module type. The runtime calls them all in
// order, merging the first non-empty value for each key.
//
// Example:
//   import { registerConfigAdapter } from 'freshvibe-cms/runtime/config-from-dom.js';
//   registerConfigAdapter('heading', (m) => {
//     const h = m.el.querySelector('h1, h2, h3, h4, h5, h6');
//     return h ? { text: h.textContent.trim(), level: h.tagName.toLowerCase() } : {};
//   });

const ADAPTERS = {};

/**
 * Register a config-from-DOM adapter for a canonical module type.
 * @param {string} moduleType - canonical type id (e.g. 'heading')
 * @param {(moduleInstance) => Object} fn - returns a config object
 */
export function registerConfigAdapter(moduleType, fn) {
  ADAPTERS[moduleType] = fn;
}

/**
 * Run all registered adapters against one module instance, returning
 * a merged config object. Only fields NOT already populated in
 * `existingConfig` are filled from DOM (operator overrides win).
 *
 * @param {Object} m - module instance with .moduleType, .el, .config
 * @returns {Object} - merged config (does NOT mutate m.config)
 */
export function populateConfigFromDOM(m) {
  if (!m || !m.el) return m?.config || {};
  const existing = m.config || {};
  // If config is already non-empty, respect operator overrides.
  if (Object.keys(existing).length > 0) return existing;
  const fn = ADAPTERS[m.moduleType];
  if (!fn) return existing;
  try {
    const fromDom = fn(m) || {};
    return { ...fromDom, ...existing };  // existing wins (no-op but explicit)
  } catch (e) {
    console.warn('[freshvibe-cms] config-from-DOM adapter failed for', m.moduleType, e);
    return existing;
  }
}

/**
 * Run against every module in the store that has empty config.
 * Returns the count of modules it populated.
 *
 * @param {Store} store
 * @returns {number}
 */
export function populateAll(store) {
  if (!store) return 0;
  let n = 0;
  for (const m of store.modules.values()) {
    const cfg = populateConfigFromDOM(m);
    if (cfg && Object.keys(cfg).length > 0 && (!m.config || Object.keys(m.config).length === 0)) {
      m.config = cfg;
      store.putModule(m);
      n++;
    }
  }
  return n;
}