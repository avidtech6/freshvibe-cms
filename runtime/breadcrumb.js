// runtime/breadcrumb.js — bottom-bar path (fragment.editor-breadcrumb)
//
// Renders a horizontal bar at the bottom of the page showing the
// current page > region > section > module path. Click any segment
// to select that element. Subscribes to FreshVibeCmsSelection for
// the current module; the page is always shown as the first segment.
//
// Per app-fragments/editor-breadcrumb/fragment.md.
// Per app-pact §3.1 Layer A: this file MUST NOT contain framework names.
// Per app-pact §3.4: this file touches only its own bar DOM.

import { getStore } from './store.js';
import { getSelection } from './selection.js';

const BAR_ID = 'fvcms-breadcrumb';

let _bar = null;
let _parent = null;
let _unsubSelection = null;

function ensureStylesheet() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('fvcms-breadcrumb-styles')) return;
  const link = document.createElement('link');
  link.id = 'fvcms-breadcrumb-styles';
  link.rel = 'stylesheet';
  link.href = new URL('./styles.css', import.meta.url).href;
  document.head.appendChild(link);
}

function buildSegment(label, kind, id, isCurrent) {
  const seg = document.createElement('button');
  seg.type = 'button';
  seg.className = 'fvcms-breadcrumb-segment';
  if (isCurrent) seg.classList.add('is-current');
  seg.textContent = label;
  seg.dataset.kind = kind;
  seg.dataset.id = id;
  seg.addEventListener('click', () => {
    if (kind && id) {
      getSelection().select({ kind, id });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fvcms:breadcrumb-navigate', {
          detail: { kind, id },
        }));
      }
    }
  });
  return seg;
}

function buildSeparator() {
  const sep = document.createElement('span');
  sep.className = 'fvcms-breadcrumb-separator';
  sep.textContent = '›';
  return sep;
}

function renderBar(selection) {
  if (!_bar || !_parent) return;
  // Tear down children, keep the bar element itself so mount/unmount is stable.
  while (_bar.firstChild) _bar.removeChild(_bar.firstChild);

  const store = getStore();
  const page = store && store.activeContext ? store.getPage(store.activeContext.page) : null;

  // Always show the page as the first segment
  if (page) {
    _bar.appendChild(buildSegment(page.title || page.id, 'page', page.id, !selection));
  } else {
    _bar.appendChild(buildSegment('No page', 'page', '', true));
    return;
  }

  if (selection && selection.kind === 'region') {
    const region = store.getRegion(selection.id);
    if (region) {
      _bar.appendChild(buildSeparator());
      _bar.appendChild(buildSegment(region.label || region.id, 'region', region.id, true));
    }
  } else if (selection && selection.kind === 'module') {
    let moduleInstance = null;
    if (store.modules.get) {
      moduleInstance = store.modules.get(selection.id);
    } else if (store.modules.values) {
      for (const m of store.modules.values()) {
        if (m.id === selection.id) { moduleInstance = m; break; }
      }
    }
    if (moduleInstance) {
      const group = moduleInstance.groupId ? store.getGroup(moduleInstance.groupId) : null;
      const region = group && group.regionId ? store.getRegion(group.regionId) : null;
      if (region) {
        _bar.appendChild(buildSeparator());
        _bar.appendChild(buildSegment(region.label || region.id, 'region', region.id, false));
      }
      if (group) {
        _bar.appendChild(buildSeparator());
        _bar.appendChild(buildSegment(group.label || group.id, 'group', group.id, false));
      }
      _bar.appendChild(buildSeparator());
      const label = moduleInstance.displayLabel || moduleInstance.moduleId || moduleInstance.id;
      _bar.appendChild(buildSegment(label, 'module', moduleInstance.id, true));
    }
  }
}

export function mountBreadcrumb(parent) {
  if (typeof document === 'undefined') return;
  if (!parent) return;
  ensureStylesheet();
  unmountBreadcrumb();   // any existing bar

  const bar = document.createElement('div');
  bar.id = BAR_ID;
  bar.className = 'fvcms-breadcrumb';
  parent.appendChild(bar);
  _bar = bar;
  _parent = parent;

  const sel = getSelection();
  renderBar(sel.get());

  _unsubSelection = sel.onChange((current) => {
    renderBar(current);
  });
}

export function unmountBreadcrumb() {
  if (_unsubSelection) {
    _unsubSelection();
    _unsubSelection = null;
  }
  if (_bar && _bar.parentNode) {
    _bar.parentNode.removeChild(_bar);
  }
  _bar = null;
  _parent = null;
}

export function isBreadcrumbMounted() {
  return _bar !== null;
}

// For tests
export function _resetBreadcrumbForTest() {
  unmountBreadcrumb();
}