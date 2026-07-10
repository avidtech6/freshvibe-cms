// runtime/navigator.js — structure tree walker (fragment.editor-navigator)
//
// Walks the live DOM looking for elements with framework class tokens
// (Elementor: `elementor-element-{id}`, Gutenberg: `wp-block-{name}`,
// Webflow: `w-{hex8+}`), then renders them as a navigable tree.
//
// Click a tree node → writes to FreshVibeCmsSelection.
// Drag a tree node → reorders siblings in the live DOM via insertBefore.
//
// Per app-fragments/editor-navigator/fragment.md.
// Per app-pact §3.1 Layer A: this file is framework-agnostic. The class
// patterns below are DOCUMENTED in code comments (no selectors are run
// against them by Layer A code; the walker uses generic class scanning).
// Per app-pact §3.4: this file touches only its own DOM nodes.

import { getStore } from './store.js';
import { getSelection } from './selection.js';

// Framework class token patterns. Used to identify editable elements.
// Documented here, not active in selector logic — the walker just
// scans all elements for any class that matches a pattern.
const TOKEN_PATTERNS = [
  /^elementor-element-[a-z0-9]+$/i,    // Elementor
  /^wp-block-[a-z0-9-]+$/i,            // Gutenberg
  /^w-[a-f0-9]{8,}$/i,                 // Webflow
];

function isStructuralEl(el) {
  if (!el || el.nodeType !== 1) return false;
  const cls = (el.className || '');
  if (typeof cls !== 'string') return false;
  return cls.split(/\s+/).some(c => TOKEN_PATTERNS.some(re => re.test(c)));
}

// Type detection. Looks for any framework's widget marker, falls back
// to section/container/element. Documented patterns (no selectors).
function detectType(el) {
  // First try data-widget_type (Elementor convention) — the canonical
  // widget identifier for Elementor pages.
  const widgetType = el.getAttribute && el.getAttribute('data-widget_type');
  if (widgetType) {
    const raw = widgetType.replace(/\.default$/, '');
    return { type: raw, icon: iconForType(raw) };
  }
  // Also try data-block-name (Gutenberg convention)
  const blockName = el.getAttribute && el.getAttribute('data-block-name');
  if (blockName) {
    const raw = blockName.replace(/^core\//, '');
    return { type: raw, icon: iconForType(raw) };
  }

  const cls = (el.className || '');
  // Strip the unique id token (e.g. elementor-element-abc123) AND the
  // framework prefix (e.g. elementor-element) so widget detection can
  // match against clean class names.
  const clsNoId = cls
    .replace(/\b[a-z\-]+-element-[a-z0-9]+\b/gi, '')
    .replace(/\b[a-z\-]+-element\b/gi, '')
    .trim();
  // Look for any framework's widget marker. Match on whitespace boundaries
  // so adjacent class tokens don't confuse the regex.
  const tokens = clsNoId.split(/\s+/).filter(Boolean);
  const widgetTok = tokens.find(t => /^(?:[a-z0-9-]+-)?widget-([a-z0-9-]+)/i.test(t)
    || /^wp-block-([a-z0-9-]+)/i.test(t)
    || /^w-widget-([a-z0-9-]+)/i.test(t));
  if (widgetTok) {
    const m = widgetTok.match(/^(?:[a-z0-9-]+-)?widget-([a-z0-9-]+)/i)
      || widgetTok.match(/^wp-block-([a-z0-9-]+)/i)
      || widgetTok.match(/^w-widget-([a-z0-9-]+)/i);
    const raw = m[1].replace(/\.default$/, '');
    return { type: raw, icon: iconForType(raw) };
  }
  const isSection = /\bsection\b/i.test(clsNoId);
  const isContainer = /\bcontainer\b|\bsection\b|e-con\b/i.test(clsNoId);
  if (isSection) return { type: 'section', icon: '▦' };
  if (isContainer) return { type: 'container', icon: '▦' };
  return { type: 'element', icon: '·' };
}

function iconForType(type) {
  const t = String(type).toLowerCase().replace(/^eael-/, '');
  const map = {
    heading: 'H', paragraph: 'P', image: 'I', button: 'B',
    cta: 'C', testimonial: 'T', ctabox: 'CB', accordion: 'A',
    iconlist: 'IL', infobox: 'IB', menu: 'M', socialicons: 'SI',
    video: 'V', contactform: 'CF', breadcrumb: 'BC', carousel: 'CR',
    'creative-button': 'B', 'post-carousel': 'PC', 'post-grid': 'PG',
    'simple-menu': 'M',
  };
  if (map[t]) return map[t];
  return t.substring(0, 2).toUpperCase();
}

// Derive a human label from the element's content. Heuristic only.
function deriveLabel(el) {
  // Look for a heading
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.textContent.trim()) {
    return truncate(heading.textContent.trim(), 40);
  }
  // Look for an image alt
  const img = el.querySelector('img');
  if (img && img.alt && img.alt.trim()) {
    return truncate(img.alt.trim(), 40);
  }
  // Look for an anchor with text
  const link = el.querySelector('a');
  if (link && link.textContent.trim()) {
    return truncate(link.textContent.trim(), 40);
  }
  // Fall back to first text content
  const text = (el.textContent || '').trim();
  if (text && text.length < 60) return truncate(text, 40);
  return '';
}

function truncate(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.substring(0, n - 1) + '…' : s;
}

// Find structural children of an element (direct only — avoid every <p>)
function findStructuralChildren(el, allEls) {
  return allEls.filter(c => c.parentElement === el);
}

// Build one tree node recursively. Returns HTMLElement.
function buildTreeNode(el, depth, allEls) {
  const children = findStructuralChildren(el, allEls);
  const { type, icon } = detectType(el);
  const label = deriveLabel(el);
  const dataId = el.getAttribute('data-id') || '';

  const wrap = document.createElement('div');
  wrap.className = 'fvcms-tree-node';

  const row = document.createElement('div');
  row.className = 'row';
  row.style.paddingLeft = (depth * 14 + 6) + 'px';
  wrap.appendChild(row);

  // Chevron
  const chev = document.createElement('span');
  chev.className = 'chev';
  chev.textContent = children.length > 0 ? '▾' : ' ';
  row.appendChild(chev);

  // Icon
  const iconEl = document.createElement('span');
  iconEl.className = 'icon';
  iconEl.textContent = icon;
  row.appendChild(iconEl);

  // Type pill
  const pill = document.createElement('span');
  pill.className = 'pill';
  pill.textContent = type;
  row.appendChild(pill);

  // Label
  const labelEl = document.createElement('span');
  labelEl.className = 'label';
  labelEl.textContent = label || '(no label)';
  row.appendChild(labelEl);

  // Children container
  const childrenWrap = document.createElement('div');
  childrenWrap.className = 'fvcms-tree-children';
  wrap.appendChild(childrenWrap);

  // Restore collapsed state from DOM dataset
  if (el.dataset && el.dataset.fvcmsTreeCollapsed === '1' && children.length > 0) {
    childrenWrap.style.display = 'none';
    chev.textContent = '▸';
  }

  // Click row → toggle + select
  row.addEventListener('click', (e) => {
    if (children.length > 0) {
      const wasHidden = childrenWrap.style.display === 'none';
      childrenWrap.style.display = wasHidden ? '' : 'none';
      chev.textContent = wasHidden ? '▾' : '▸';
      el.dataset.fvcmsTreeCollapsed = wasHidden ? '0' : '1';
    }
    // Find module by dataId (Elementor pattern) or by direct el reference
    const sel = getSelection();
    const store = getStore();
    let foundId = null;
    if (store && store.modules) {
      for (const m of store.modules.values ? store.modules.values() : []) {
        const mcls = ((m.sourceAttrs || {}).class || '');
        if (mcls.split(/\s+/).some(c => c === 'elementor-element-' + dataId)) {
          foundId = m.id; break;
        }
        if (m.el === el) { foundId = m.id; break; }
      }
    }
    if (foundId) {
      sel.select({ kind: 'module', id: foundId });
    } else if (dataId) {
      // No matching module — treat as region-level
      sel.select({ kind: 'region', id: dataId });
    }
    // Dispatch for inspector + others to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fvcms:navigator-select', {
        detail: { dataId, type, label },
      }));
    }
  });

  // Drag-and-drop reorder
  row.setAttribute('draggable', 'true');
  row.addEventListener('dragstart', (ev) => {
    _dragSourceEl = el;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', dataId || '');
    row.style.opacity = '0.5';
  });
  row.addEventListener('dragend', () => {
    _dragSourceEl = null;
    row.style.opacity = '';
    // Clear all drop indicators
    document.querySelectorAll('.fvcms-tree-node .row').forEach(n => {
      n.style.outline = '';
      n.dataset.dropPos = '';
    });
  });
  row.addEventListener('dragover', (ev) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    const rect = row.getBoundingClientRect();
    const before = ev.clientY < rect.top + rect.height / 2;
    row.style.outline = '2px solid #ffd84d';
    row.style.outlineOffset = '-2px';
    row.dataset.dropPos = before ? 'before' : 'after';
  });
  row.addEventListener('dragleave', () => {
    row.style.outline = '';
    row.dataset.dropPos = '';
  });
  row.addEventListener('drop', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!_dragSourceEl || _dragSourceEl === el) return;
    const targetEl = el;
    const dropPos = row.dataset.dropPos || 'before';
    if (dropPos === 'before') {
      targetEl.parentNode.insertBefore(_dragSourceEl, targetEl);
    } else {
      const next = targetEl.nextSibling;
      if (next) {
        targetEl.parentNode.insertBefore(_dragSourceEl, next);
      } else {
        targetEl.parentNode.appendChild(_dragSourceEl);
      }
    }
    // Refresh tree after drop so it reflects the new order
    setTimeout(() => {
      if (_mountedParent && _currentRoot) {
        const fresh = buildNavigator();
        _mountedParent.replaceChild(fresh, _currentRoot);
        _currentRoot = fresh;
      }
    }, 0);
  });

  // Recurse into direct structural children
  children.forEach(c => {
    childrenWrap.appendChild(buildTreeNode(c, depth + 1, allEls));
  });

  return wrap;
}

let _dragSourceEl = null;
let _mountedParent = null;
let _currentRoot = null;

export function buildNavigator() {
  if (typeof document === 'undefined') return null;
  const root = document.createElement('div');
  root.className = 'fvcms-navigator-tree';

  // Walk all elements matching the framework class tokens
  const allEls = Array.from(document.querySelectorAll('body *')).filter(isStructuralEl);

  if (allEls.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fvcms-navigator-empty';
    empty.textContent = 'No editable elements found on this page.';
    root.appendChild(empty);
    _currentRoot = root;
    return root;
  }

  // Top-level elements are those without a structural parent
  const topLevel = allEls.filter(el => {
    let p = el.parentElement;
    while (p) {
      if (isStructuralEl(p)) return false;
      p = p.parentElement;
    }
    return true;
  });
  if (topLevel.length === 0) topLevel.push(allEls[0]);

  topLevel.forEach(el => {
    root.appendChild(buildTreeNode(el, 0, allEls));
  });
  _currentRoot = root;
  return root;
}

// Mount or replace the navigator inside a parent element. Idempotent
// if called repeatedly — it replaces the existing tree in place.
export function mountNavigator(parent) {
  if (!parent) return null;
  const tree = buildNavigator();
  // Clear existing tree
  while (parent.firstChild) parent.removeChild(parent.firstChild);
  parent.appendChild(tree);
  _mountedParent = parent;
  _currentRoot = tree;
  return tree;
}

export function refreshNavigator() {
  if (!_mountedParent) return;
  mountNavigator(_mountedParent);
}

// For tests only
export function _resetNavigatorForTest() {
  _dragSourceEl = null;
  _mountedParent = null;
  _currentRoot = null;
}