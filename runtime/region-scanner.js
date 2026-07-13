// runtime/region-scanner.js — runtime region detection.
//
// FvRE (FreshVibe Reconstruction Engine) does an offline pass on the
// page and tries to detect regions + modules. But the offline pass
// can miss things — Elementor section structure is hard to identify
// from a static scrape, and the FvRE detector was looking for the
// wrong class.
//
// This module is the RUNTIME FIX. On FES boot, we walk the live DOM
// and find every Elementor top-level section (e-parent), making each
// one a region in the store. We don't replace the FvRE regions —
// we ADD to them. If a region is already in the store (by id or
// selector), we skip it. The result: the FES sees a complete picture
// of the page, even if FvRE was incomplete.
//
// Per FreshVibe Way V8 §3.9: this is a private FES module. It
// touches only the store and the DOM. It does not depend on
// framework-specific selectors in the public surface; the
// framework patterns are documented in code comments.

import { getStore } from './store.js';

// Framework class tokens that identify a top-level section container.
// We support Elementor's e-con today; adding Bricks / Divi / etc.
// is a one-line addition here.
const SECTION_PATTERNS = [
  // Elementor Flex Container (the modern Elementor layout primitive)
  { re: /e-con\b/, framework: 'elementor' },
];

// Selector that picks up every top-level section in the page.
// Top-level = e-parent (Elementor's marker for root-level containers).
const SECTION_SELECTOR = '.e-parent';

/**
 * Find every top-level section in the live DOM. Returns an array of
 * { element, framework, label, dataId }.
 */
export function findSectionsInDom() {
  if (typeof document === 'undefined') return [];
  const sections = [];
  for (const el of document.querySelectorAll(SECTION_SELECTOR)) {
    // Must be visible (have dimensions) — invisible elements
    // (e.g. hide-on-mobile variants) shouldn't be a region
    const rect = el.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) continue;
    const framework = detectFramework(el);
    if (!framework) continue;
    sections.push({
      element: el,
      framework,
      label: deriveLabel(el),
      dataId: el.getAttribute('data-id') || '',
    });
  }
  return sections;
}

function detectFramework(el) {
  const cls = (el.className || '');
  if (typeof cls !== 'string') return null;
  for (const { re, framework } of SECTION_PATTERNS) {
    if (re.test(cls)) return framework;
  }
  return null;
}

function deriveLabel(el) {
  // Try to find a heading inside the section
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6, [class*="heading"]');
  if (heading) {
    const text = (heading.textContent || '').trim();
    if (text) return text.substring(0, 60);
  }
  // Try to find an image with alt
  const img = el.querySelector('img[alt]');
  if (img && img.alt) return img.alt.substring(0, 60);
  // Try the data-id as a fallback
  const dataId = el.getAttribute('data-id');
  if (dataId) return 'Section ' + dataId.substring(0, 6);
  return 'Section';
}

/**
 * Find sections in the DOM, register each as a region in the store.
 * Idempotent: if a region with the same id or selector already exists,
 * we skip it. Returns the list of newly-added regions.
 */
export function scanAndRegisterSections() {
  const store = getStore();
  const page = store.getPage(store.activeContext.page);
  if (!page) return [];

  const sections = findSectionsInDom();
  const existing = new Set(Object.keys(store.regions));
  const existingSelectors = new Set(
    Object.values(store.regions).map((r) => r.selector).filter(Boolean)
  );
  const added = [];

  for (const s of sections) {
    // Build a stable selector for the section. Elementor's data-id is
    // the canonical hook. We also accept e-con and e-parent as
    // fallbacks if data-id is missing.
    const selector = s.dataId
      ? `[data-id="${s.dataId}"]`
      : `.e-parent${s.element.className ? '.' + s.element.className.split(/\s+/).filter((c) => c !== 'e-parent')[0] : ''}`;

    if (existingSelectors.has(selector)) continue;

    // Generate a unique region id. Use data-id hash for stability
    // across reloads (so the same Elementor section always gets the
    // same region id).
    const regionId = s.dataId
      ? 'R-auto-' + s.dataId
      : 'R-auto-' + sections.indexOf(s);

    if (existing.has(regionId)) continue;

    const region = {
      id: regionId,
      label: s.label,
      selector,
      config: {},
      moduleInstanceIds: [],
      source: 'runtime-scan',
      framework: s.framework,
    };
    store.putRegion(region);
    added.push(region);
  }

  if (added.length > 0) {
    // Add the new region ids to the page
    page.regionIds = page.regionIds || [];
    for (const r of added) {
      if (!page.regionIds.includes(r.id)) page.regionIds.push(r.id);
    }
    store._persist('pages', page);
  }

  return added;
}

/**
 * After regions are scanned, find the modules in each region.
 * We walk down from each e-parent, picking up every widget child
 * (data-widget_type, e-con, .eael-*, etc.) and registering them
 * as modules in the store.
 *
 * This is the same logic FvRE does offline, but at runtime, so
 * we don't depend on FvRE's incomplete output.
 */
export function scanAndRegisterModulesInRegions() {
  const store = getStore();
  const sections = findSectionsInDom();
  const added = [];

  for (const s of sections) {
    const regionId = s.dataId
      ? 'R-auto-' + s.dataId
      : 'R-auto-' + sections.indexOf(s);
    const region = store.getRegion(regionId);
    if (!region) continue;

    // Find every widget child of this section
    const widgets = s.element.querySelectorAll(
      '[data-widget_type], [data-id]:not(.e-parent), .elementor-widget, .eael-post-grid-column, .eael-entry'
    );
    for (const w of widgets) {
      const dataId = w.getAttribute('data-id');
      if (!dataId) continue;
      // Skip sections (we only want widgets)
      if (w.classList.contains('e-parent') || w.classList.contains('e-con')) continue;
      const moduleId = 'MI-auto-' + dataId;
      if (store.getModule(moduleId)) continue;

      const widgetType = w.getAttribute('data-widget_type') || 'unknown';
      const moduleType = widgetType.replace(/\.default$/, '').split('.')[0];
      const m = {
        id: moduleId,
        moduleId: moduleType,
        groupId: regionId,
        regionId: regionId,
        el: w,
        label: deriveWidgetLabel(w),
        config: {},
        source: 'runtime-scan',
      };
      store.putModule(m);
      // Register the module id in the region
      region.moduleInstanceIds = region.moduleInstanceIds || [];
      if (!region.moduleInstanceIds.includes(moduleId)) region.moduleInstanceIds.push(moduleId);
      added.push(m);
    }
    // Persist the region with the new moduleIds
    store._persist('regions', region);
  }

  return added;
}

function deriveWidgetLabel(el) {
  // Try heading text
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6, [class*="heading"]');
  if (heading) {
    const text = (heading.textContent || '').trim();
    if (text) return text.substring(0, 60);
  }
  // Try alt
  const img = el.querySelector('img[alt]');
  if (img && img.alt) return img.alt.substring(0, 60);
  // Try button text
  const button = el.querySelector('button, a.elementor-button, [class*="button"]');
  if (button) {
    const text = (button.textContent || '').trim();
    if (text) return text.substring(0, 60);
  }
  // Fallback: data-id
  return 'Widget ' + (el.getAttribute('data-id') || '').substring(0, 6);
}

/**
 * Run both scans: regions first, then modules. Returns a summary.
 */
export function autoDetectEverything() {
  const regions = scanAndRegisterSections();
  const modules = scanAndRegisterModulesInRegions();
  return {
    regionsAdded: regions.length,
    modulesAdded: modules.length,
    regions,
    modules,
  };
}
