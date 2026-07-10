// runtime/context-menu.js — right-click menu for regions/modules (fragment.editor-context-menu)
//
// Pure additive. Listens for the openContextMenu() call, builds a
// floating menu near the cursor with actions for the current selection.
// Dismisses on outside click, Escape, or action execution.
//
// Per app-fragments/editor-context-menu/fragment.md.
// Per app-pact §3.1 Layer A: this file MUST NOT contain framework names.
// Per app-pact §3.4: this file touches only its own menu DOM.
// Per app-pact §3.6: not a panel — doesn't use PanelManager.

import { getStore } from './store.js';
import { getSelection } from './selection.js';
import { openEditorShell, closeEditorShell } from './editor-shell.js';

const MENU_ID = 'fvcms-context-menu';
let _currentMenu = null;
let _currentTarget = null;
let _currentKind = null;
let _currentId = null;
let _outsideClickHandler = null;
let _escapeHandler = null;

function ensureStylesheet() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('fvcms-context-menu-styles')) return;
  const link = document.createElement('link');
  link.id = 'fvcms-context-menu-styles';
  link.rel = 'stylesheet';
  link.href = new URL('./styles.css', import.meta.url).href;
  document.head.appendChild(link);
}

function buildMenuDOM(actions) {
  const menu = document.createElement('div');
  menu.className = 'fvcms-context-menu';
  menu.setAttribute('role', 'menu');
  for (const action of actions) {
    if (action.divider) {
      const d = document.createElement('div');
      d.className = 'fvcms-context-menu-divider';
      menu.appendChild(d);
      continue;
    }
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'fvcms-context-menu-item';
    if (action.danger) item.classList.add('fvcms-context-menu-danger');
    item.textContent = action.label;
    item.setAttribute('role', 'menuitem');
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeContextMenu();
      try { action.handler(); } catch (err) {
        console.error('[freshvibe-cms] context menu action failed:', err);
      }
    });
    menu.appendChild(item);
  }
  return menu;
}

function positionMenu(menu, x, y) {
  // Clamp to viewport so menu doesn't go off-screen
  if (typeof document === 'undefined') return;
  const viewportW = document.documentElement?.clientWidth || window.innerWidth;
  const viewportH = document.documentElement?.clientHeight || window.innerHeight;
  // Default: position at (x, y). After mount, adjust if off-screen.
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  // We can't measure yet (not mounted). Apply heuristic: clamp x and y.
  const rect = menu.getBoundingClientRect ? menu.getBoundingClientRect() : { width: 200, height: 300 };
  if (x + rect.width > viewportW) menu.style.left = (viewportW - rect.width - 4) + 'px';
  if (y + rect.height > viewportH) menu.style.top = (viewportH - rect.height - 4) + 'px';
}

function detachOutsideHandlers() {
  if (_outsideClickHandler && typeof document !== 'undefined') {
    document.removeEventListener('click', _outsideClickHandler, true);
    _outsideClickHandler = null;
  }
  if (_escapeHandler && typeof window !== 'undefined') {
    window.removeEventListener('keydown', _escapeHandler, true);
    _escapeHandler = null;
  }
}

export function openContextMenu({ x, y, target, kind, id } = {}) {
  if (typeof document === 'undefined') return;
  ensureStylesheet();
  closeContextMenu();   // any existing menu

  const store = getStore();
  let moduleInstance = null;
  if (kind === 'module' && store && store.modules) {
    moduleInstance = store.modules.get ? store.modules.get(id) : null;
    if (!moduleInstance && store.modules.values) {
      for (const m of store.modules.values()) {
        if (m.id === id) { moduleInstance = m; break; }
      }
    }
  }

  const actions = [];

  if (kind === 'module' && moduleInstance) {
    actions.push({
      label: 'Edit',
      handler: () => {
        // Selection triggers the inspector via the auto-open subscription.
        getSelection().select({ kind: 'module', id });
      },
    });
    actions.push({
      label: 'Duplicate',
      handler: () => {
        const dup = {
          ...moduleInstance,
          id: moduleInstance.id + '-copy-' + Date.now().toString(36),
        };
        if (moduleInstance.el && moduleInstance.el.parentNode) {
          moduleInstance.el.parentNode.insertBefore(dup.el || moduleInstance.el, moduleInstance.el.nextSibling);
        }
        if (store.putModule) store.putModule(dup);
        getSelection().select({ kind: 'module', id: dup.id });
      },
    });
    actions.push({
      label: 'Rename',
      handler: () => {
        const next = window.prompt('Rename this module:', moduleInstance.displayLabel || moduleInstance.id);
        if (next && next !== moduleInstance.displayLabel) {
          moduleInstance.displayLabel = next;
          if (!moduleInstance.legacyConfig) moduleInstance.legacyConfig = {};
          moduleInstance.legacyConfig.__instanceName = next;
          if (store.putModule) store.putModule(moduleInstance);
        }
      },
    });
    actions.push({ divider: true });
    actions.push({
      label: 'Move up',
      handler: () => moveSibling(moduleInstance, -1),
    });
    actions.push({
      label: 'Move down',
      handler: () => moveSibling(moduleInstance, 1),
    });
    actions.push({ divider: true });
    actions.push({
      label: 'Delete',
      danger: true,
      handler: () => {
        closeEditorShell(moduleInstance.id);
        if (moduleInstance.el && moduleInstance.el.parentNode) {
          moduleInstance.el.parentNode.removeChild(moduleInstance.el);
        }
        if (store.deleteModule) store.deleteModule(moduleInstance.id);
        else if (store.modules && store.modules.delete) store.modules.delete(moduleInstance.id);
        getSelection().clear();
      },
    });
  } else if (kind === 'region') {
    actions.push({
      label: 'Rename region',
      handler: () => {
        const region = store.getRegion ? store.getRegion(id) : null;
        if (!region) return;
        const next = window.prompt('Rename region:', region.label || id);
        if (next && next !== region.label) {
          region.label = next;
          if (store.putRegion) store.putRegion(region);
        }
      },
    });
    actions.push({ divider: true });
    actions.push({
      label: 'Hide overlays',
      handler: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fvcms:hide-overlays', { detail: { regionId: id } }));
        }
      },
    });
  } else {
    // Generic / no target — show "No actions"
    actions.push({ label: 'No actions available', handler: () => {} });
  }

  const menu = buildMenuDOM(actions);
  document.body.appendChild(menu);
  positionMenu(menu, x || 0, y || 0);

  _currentMenu = menu;
  _currentTarget = target;
  _currentKind = kind;
  _currentId = id;

  // Outside-click dismiss
  _outsideClickHandler = () => closeContextMenu();
  // Use capture so we dismiss before any other handler
  document.addEventListener('click', _outsideClickHandler, true);

  // Escape dismiss
  _escapeHandler = (e) => {
    if (e.key === 'Escape') closeContextMenu();
  };
  window.addEventListener('keydown', _escapeHandler, true);
}

export function closeContextMenu() {
  detachOutsideHandlers();
  if (_currentMenu && _currentMenu.parentNode) {
    _currentMenu.parentNode.removeChild(_currentMenu);
  }
  _currentMenu = null;
  _currentTarget = null;
  _currentKind = null;
  _currentId = null;
}

export function isContextMenuOpen() {
  return _currentMenu !== null;
}

function moveSibling(moduleInstance, direction) {
  const el = moduleInstance && moduleInstance.el;
  if (!el || !el.parentNode) return;
  if (direction === -1) {
    const prev = el.previousElementSibling;
    if (!prev) return;
    el.parentNode.insertBefore(el, prev);
  } else {
    const next = el.nextElementSibling;
    if (!next) return;
    el.parentNode.insertBefore(next, el);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fvcms:reordered', {
      detail: { moduleId: moduleInstance.id, direction },
    }));
  }
}

// For tests
export function _resetContextMenuForTest() {
  detachOutsideHandlers();
  _currentMenu = null;
  _currentTarget = null;
  _currentKind = null;
  _currentId = null;
  // Also clear the body of any leftover menus so each test starts clean
  if (typeof document !== 'undefined' && document.body) {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  }
}