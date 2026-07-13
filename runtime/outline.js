// runtime/outline.js — yellow tag overlays on the page
//
// This is the editor-outline feature extracted from visualizer.js.
// Region tags (one per region) and module tags (one per module in
// the selected region) float on the page and follow their targets
// as the user scrolls.
//
// Per app-fragments/editor-outline/fragment.md.
// Per app-pact §3.1 Layer A: this file MUST NOT contain framework names.
// Per app-pact §3.4: this file touches only its own DOM nodes (the
// fvcms-region-tag / fvcms-module-tag elements it creates).
// Per app-pact §3.6: this file does NOT own the panel manager —
// it calls PanelManager for tag-click actions, doesn't manage it.

import { getStore } from './store.js';
import { getSelection } from './selection.js';

const REGION_TAG_CLASS = 'fvcms-region-tag';
const MODULE_TAG_CLASS = 'fvcms-module-tag';
const SELECTED_CLASS = 'is-selected';
const CONTAINER_ID = 'fvcms-outline-container';

let _active = false;
let _tags = [];      // [{ kind, regionId, moduleId, target, tagEl, rafHandle, unsubSelection }]

function getPanelManager() {
  if (typeof window === 'undefined') return null;
  return (window.PanelManager || window.OscarPanelManager || null);
}

function getPanelManagerInstance() {
  const api = getPanelManager();
  if (!api) return null;
  return api.get ? api.get() : null;
}

function ensureContainer() {
  if (typeof document === 'undefined') return null;
  let c = document.getElementById(CONTAINER_ID);
  if (!c) {
    c = document.createElement('div');
    c.id = CONTAINER_ID;
    // Container itself is invisible — only the tags inside show.
    c.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;overflow:visible;pointer-events:none;';
    document.body.appendChild(c);
  }
  return c;
}

function buildRegionTag(region, regionId) {
  const tag = document.createElement('div');
  tag.className = REGION_TAG_CLASS;
  tag.dataset.regionId = regionId;
  tag.setAttribute('role', 'button');
  tag.setAttribute('aria-label', `Region ${region.label || regionId}`);

  const prefix = document.createElement('span');
  prefix.className = 'fvcms-tag-prefix';
  prefix.textContent = '◆';
  tag.appendChild(prefix);

  const label = document.createElement('span');
  label.className = 'fvcms-tag-label';
  label.textContent = 'REGION: ' + (region.label || regionId);
  tag.appendChild(label);

  return tag;
}

function buildModuleTag(module, regionId) {
  const tag = document.createElement('div');
  tag.className = MODULE_TAG_CLASS;
  tag.dataset.regionId = regionId;
  tag.dataset.moduleId = module.id;
  tag.dataset.moduleType = module.moduleId || '';
  tag.setAttribute('role', 'button');
  tag.setAttribute('aria-label', `Module ${module.moduleId || module.id}`);

  const tag1 = document.createElement('span');
  tag1.className = 'fvcms-tag-type';
  // Short type label — M-heading -> "H", M-image -> "I", M-button -> "B"
  tag1.textContent = shortTypeLabel(module.moduleId);
  tag.appendChild(tag1);

  const tag2 = document.createElement('span');
  tag2.className = 'fvcms-tag-label';
  tag2.textContent = (module.displayLabel || module.moduleId || module.id);
  tag.appendChild(tag2);

  return tag;
}

function shortTypeLabel(moduleId) {
  if (!moduleId) return '?';
  const m = String(moduleId).replace(/^M-/, '');
  const map = {
    heading: 'H', paragraph: 'P', image: 'I', button: 'B',
    cta: 'C', testimonial: 'T', cta_box: 'CB', accordion: 'A',
    icon_list: 'IL', info_box: 'IB', menu: 'M', social_icons: 'SI',
    video: 'V', contact_form: 'CF', breadcrumb: 'BC', carousel: 'CR',
  };
  return map[m] || m.substring(0, 2).toUpperCase();
}

function startReposition(tagEl, target) {
  function position() {
    const r = target.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    // Region is in viewport: position tag at top-left of region.
    // Region is above viewport (scrolled past): pin tag to top.
    // Region is below viewport (not yet scrolled to): pin tag to
    // bottom of viewport so the operator can see it.
    let top;
    if (r.top < 0) {
      // scrolled past — pin to top
      top = 8;
    } else if (r.top > vh) {
      // not yet visible — pin to bottom
      top = vh - (tagEl.offsetHeight || 24) - 8;
    } else {
      // in viewport
      top = r.top + 4;
    }
    const left = Math.max(8, Math.min(vw - 240, r.left));
    tagEl.style.left = left + 'px';
    tagEl.style.top = top + 'px';
  }
  position();
  function tick() {
    if (!tagEl.isConnected) return;
    position();
    tagEl._raf = requestAnimationFrame(tick);
  }
  tagEl._raf = requestAnimationFrame(tick);
}

function attachClickRegion(tag, regionId) {
  tag.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = getSelection();
    sel.select({ kind: 'region', id: regionId });
    // Activate the region panel if it exists.
    const api = getPanelManager();
    if (api) {
      const panelId = 'fvcms-region-' + regionId;
      const mgr = getPanelManagerInstance();
      if (mgr && mgr.panels && mgr.panels[panelId]) {
        if (typeof mgr.activate === 'function') mgr.activate(panelId);
      }
    }
  });
}

function attachClickModule(tag, regionId, moduleId) {
  tag.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = getSelection();
    sel.select({ kind: 'module', id: moduleId });
    // Open the module editor shell.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fvcms:open-module-editor', {
        detail: { moduleId, regionId },
      }));
    }
  });
}

function applySelectionHighlight(selection) {
  // Refresh selected class on each tag based on current selection.
  for (const t of _tags) {
    const isSelected =
      (t.kind === 'region' && selection?.kind === 'region' && selection.id === t.regionId) ||
      (t.kind === 'module' && selection?.kind === 'module' && selection.id === t.moduleId);
    t.tagEl.classList.toggle(SELECTED_CLASS, !!isSelected);
  }
}

function spawnRegionTags(container, store, selection) {
  const page = store.getPage(store.activeContext.page);
  if (!page) return;
  for (const regionId of page.regionIds || []) {
    const region = store.getRegion(regionId);
    if (!region) continue;
    const target = region.selector ? document.querySelector(region.selector) : null;
    if (!target) continue;
    const tag = buildRegionTag(region, regionId);
    container.appendChild(tag);
    attachClickRegion(tag, regionId);
    startReposition(tag, target);

    const entry = { kind: 'region', regionId, target, tagEl: tag, rafHandle: null };
    _tags.push(entry);
  }
}

function spawnModuleTags(container, store, selection) {
  // Only show module tags for the SELECTED region. Without a region
  // selection, no modules are tagged (we don't want to drown the page).
  if (!selection || selection.kind !== 'region') return;
  const regionId = selection.id;
  const region = store.getRegion(regionId);
  if (!region) return;
  const groups = store.listGroupsForRegion ? store.listGroupsForRegion(regionId) : [];
  for (const group of groups) {
    const modules = store.listModulesForGroup(group.id);
    for (const m of modules) {
      // module.el is the DOM node populated by populateAll + connectModule.
      const target = m.el || (region.selector ? document.querySelector(region.selector + ' [data-fvcms-module-id="' + m.id + '"]') : null);
      if (!target) continue;
      const tag = buildModuleTag(m, regionId);
      container.appendChild(tag);
      attachClickModule(tag, regionId, m.id);
      startReposition(tag, target);
      const entry = { kind: 'module', regionId, moduleId: m.id, target, tagEl: tag, rafHandle: null };
      _tags.push(entry);
    }
  }
}

function teardownAll() {
  for (const t of _tags) {
    if (t.rafHandle) cancelAnimationFrame(t.rafHandle);
    if (t.tagEl && t.tagEl._raf) cancelAnimationFrame(t.tagEl._raf);
    if (t.unsubSelection && typeof t.unsubSelection === 'function') t.unsubSelection();
    if (t.tagEl && t.tagEl.parentNode) t.tagEl.parentNode.removeChild(t.tagEl);
  }
  _tags = [];
  if (typeof document !== 'undefined') {
    const c = document.getElementById(CONTAINER_ID);
    if (c && c.parentNode) c.parentNode.removeChild(c);
  }
}

function render(selection) {
  if (typeof document === 'undefined') return;
  // Capture the *current* selection once. The onChange listener will
  // see this exact value as `previous` on its first fire, and can
  // detect region changes by comparing prevRegion / newRegion.
  const initial = selection;
  teardownAll();
  const container = ensureContainer();
  if (!container) return;
  const store = getStore();
  spawnRegionTags(container, store, selection);
  spawnModuleTags(container, store, selection);
  applySelectionHighlight(selection);
  // Subscribe to selection changes. Only changes that affect
  // module-tag visibility (i.e. region kind/id changed) trigger a
  // full re-render. Pure highlight changes are cheap (class toggle).
  const sel = getSelection();
  const unsub = sel.onChange((current) => {
    const prevRegion = initial && initial.kind === 'region' ? initial.id : null;
    const newRegion = current && current.kind === 'region' ? current.id : null;
    const prevKind = initial ? initial.kind : null;
    const newKind = current ? current.kind : null;
    if (prevRegion !== newRegion || prevKind !== newKind) {
      render(current);  // region/kind change → full re-render
    } else {
      applySelectionHighlight(current);  // same region/kind → cheap highlight
    }
  });
  // Attach unsub to the last tag entry so teardown can call it.
  if (_tags.length > 0) {
    _tags[_tags.length - 1].unsubSelection = unsub;
  }
}

export function startOutlines() {
  if (_active) return;
  _active = true;
  const sel = getSelection();
  const current = sel.get();
  render(current);
}

export function stopOutlines() {
  if (!_active) return;
  _active = false;
  teardownAll();
}

export function isOutlinesActive() {
  return _active;
}

export function refreshOutlines() {
  if (!_active) return;
  const sel = getSelection();
  render(sel.get());
}

// For tests only — clear internal state without needing a full teardown
export function _resetOutlineForTest() {
  _active = false;
  teardownAll();
}