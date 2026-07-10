// tests/inspector.mjs — smoke test for fragment.editor-inspector
// Run with: node tests/inspector.mjs

// Minimal DOM stub for inspector — needs elements with appendChild,
// removeChild, addEventListener, querySelector, plus classList.
// Editor shell needs the panel manager singleton, which we mock.
function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    className: '',
    children: [],
    style: {},
    dataset: {},
    attributes: {},
    parentNode: null,
    nodeType: 1,
    textContent: '',
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle(c, on) {
        if (on === undefined) on = !this._classes.has(c);
        if (on) this._classes.add(c); else this._classes.delete(c);
        return on;
      },
    },
    offsetWidth: 100,
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k] || null; },
    appendChild(c) {
      this.children.push(c);
      c.parentNode = this;
      c.parentElement = (this.nodeType === 1) ? this : (this.parentElement || null);
      return c;
    },
    removeChild(c) {
      const i = this.children.indexOf(c);
      if (i >= 0) { this.children.splice(i, 1); c.parentNode = null; c.parentElement = null; }
      return c;
    },
    insertBefore(newNode, refNode) {
      const idx = refNode ? this.children.indexOf(refNode) : this.children.length;
      this.children.splice(idx === -1 ? this.children.length : idx, 0, newNode);
      newNode.parentNode = this;
      newNode.parentElement = (this.nodeType === 1) ? this : (this.parentElement || null);
      return newNode;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    getBoundingClientRect() { return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }; },
    dispatchEvent() {},
    focus() {},
    remove() {},
    blur() {},
  };
  Object.defineProperty(el, 'firstChild', { get() { return this.children[0] || null; } });
  return el;
}

// Mock PanelManager singleton — captures addPanel / dock / activate calls.
const _panels = new Map();
let _nextPanelId = 1;
global.window = {
  PanelManager: {
    get() {
      return {
        list() {
          return { panels: Array.from(_panels.values()) };
        },
        create() {},
        addPanel(opts) {
          const id = opts.id || ('panel-' + (_nextPanelId++));
          const panel = {
            id,
            state: 'docked-active',
            content: opts.content,
            _opts: opts,
          };
          _panels.set(id, panel);
          return panel;
        },
        dock(id, edge) {
          const p = _panels.get(id);
          if (p) p.state = 'docked-active';
        },
        activate(id) {
          const p = _panels.get(id);
          if (p) p.state = 'docked-active';
        },
        collapse(id) {
          const p = _panels.get(id);
          if (p) p.state = 'docked-collapsed';
        },
        close(id) {
          _panels.delete(id);
        },
        removePanel(id) {
          _panels.delete(id);
        },
      };
    },
  },
  OscarPanelManager: null,
  dispatchEvent() {},
};

global.document = {
  body: makeEl('body'),
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement: (tag) => makeEl(tag),
  createElementNS: (tag) => makeEl(tag),
  getElementById() { return null; },
  dispatchEvent() {},
};
global.CustomEvent = function(t, init) { this.type = t; this.detail = init && init.detail; };
global.requestAnimationFrame = (cb) => setTimeout(() => cb(), 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.clearTimeout = clearTimeout;
global.setTimeout = setTimeout;

import { openEditorShell, closeEditorShell, _startSelectionAutoOpen, _stopSelectionAutoOpen } from '../runtime/editor-shell.js';
import { _resetSelection, getSelection } from '../runtime/selection.js';
import { getModuleDef } from '../modules/index.js';
import { getStore } from '../runtime/store.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  ✓ ${msg}`); passed++; }
  else { console.error(`  ✗ ${msg}`); failed++; }
}

// Reset panel state between tests
function resetPanels() { _panels.clear(); }

console.log('Test: openEditorShell creates a panel');
resetPanels();
const testModule = {
  id: 'm-001',
  moduleId: 'M-heading',
  config: { text: 'Hello', level: 'h2' },
};
const testDef = getModuleDef('M-heading');
const panel = openEditorShell({
  moduleInstance: testModule,
  moduleDef: testDef,
  store: null,
  onSave: () => {},
});
assert(panel !== null, 'openEditorShell returns a panel');
assert(panel.id === 'fvcms-edit-m-001', `panel id is fvcms-edit-m-001 (got "${panel.id}")`);
assert(panel.content && panel.content.className === 'fvcms-editor-body', 'panel body has fvcms-editor-body class');
assert(panel.content.dataset.moduleId === 'm-001', 'panel body has correct data-module-id');
assert(panel.content.dataset.moduleType === 'M-heading', 'panel body has correct data-module-type');

console.log('\nTest: openEditorShell is idempotent — reopens same module');
resetPanels();
openEditorShell({ moduleInstance: testModule, moduleDef: testDef, store: null, onSave: () => {} });
const initialPanelCount = _panels.size;
openEditorShell({ moduleInstance: testModule, moduleDef: testDef, store: null, onSave: () => {} });
assert(_panels.size === initialPanelCount, `reopen does not create duplicate panel (count ${initialPanelCount})`);

console.log('\nTest: openEditorShell creates separate panels for different modules');
resetPanels();
const module2 = { id: 'm-002', moduleId: 'M-heading', config: { text: 'World' } };
openEditorShell({ moduleInstance: testModule, moduleDef: testDef, store: null, onSave: () => {} });
openEditorShell({ moduleInstance: module2, moduleDef: testDef, store: null, onSave: () => {} });
assert(_panels.size === 2, `2 distinct panels for 2 modules (got ${_panels.size})`);

console.log('\nTest: closeEditorShell removes the panel');
resetPanels();
openEditorShell({ moduleInstance: testModule, moduleDef: testDef, store: null, onSave: () => {} });
assert(_panels.size === 1, 'panel created');
closeEditorShell('m-001');
assert(_panels.size === 0, `panel removed after close (got ${_panels.size})`);
closeEditorShell('m-001');  // idempotent — no throw on missing
assert(_panels.size === 0, 'close on missing panel is no-op');

console.log('\nTest: inspector body contains tabs + status');
resetPanels();
openEditorShell({ moduleInstance: testModule, moduleDef: testDef, store: null, onSave: () => {} });
const body = panel.content;
const status = body.children.find(c => c.className === 'fvcms-editor-status');
const tabs = body.children.find(c => c.className === 'fvcms-editor-tabs');
const tabContent = body.children.find(c => c.className === 'fvcms-editor-tab-content');
assert(status !== undefined, 'status line present');
assert(tabs !== undefined, 'tabs bar present');
assert(tabs.children.length === 3, `3 tabs (Fields / Variants / Raw JSON) (got ${tabs.children.length})`);
const tabLabels = tabs.children.map(c => c.textContent);
assert(tabLabels.includes('Fields') && tabLabels.includes('Variants') && tabLabels.includes('Raw JSON'),
  `tab labels include all 3 (got ${JSON.stringify(tabLabels)})`);
assert(tabContent !== undefined, 'tab content area present');

console.log('\nTest: Fields tab is active by default');
resetPanels();
const newPanel = openEditorShell({ moduleInstance: testModule, moduleDef: testDef, store: null, onSave: () => {} });
const fieldsTab = newPanel.content.children.find(c => c.className === 'fvcms-editor-tabs').children[0];
assert(fieldsTab.classList.contains('fvcms-tab-active'), 'Fields tab has fvcms-tab-active class');
assert(tabContent.children.length === 1, 'tab content has 1 child (the Fields form)');

console.log('\nTest: clicking tabs swaps content');
resetPanels();
// Patch document.createElement BEFORE opening the shell so handlers are captured
const _capturedListeners = new WeakMap();
const _origCreateElement = global.document.createElement;
global.document.createElement = function(tag) {
  const el = _origCreateElement(tag);
  const orig = el.addEventListener;
  el.addEventListener = (event, fn) => {
    if (event === 'click') _capturedListeners.set(el, fn);
    return orig.call(el, event, fn);
  };
  return el;
};
const p = openEditorShell({ moduleInstance: testModule, moduleDef: testDef, store: null, onSave: () => {} });
const pTabs = p.content.children.find(c => c.className === 'fvcms-editor-tabs').children;
assert(_capturedListeners.has(pTabs[1]), 'Variants tab click handler is wired');
const handler = _capturedListeners.get(pTabs[1]);
handler({ preventDefault(){}, stopPropagation(){} });
const variantsActive = pTabs[1].classList.contains('fvcms-tab-active');
assert(variantsActive, 'Variants tab is active after click');
const tabContent2 = p.content.children.find(c => c.className === 'fvcms-editor-tab-content');
assert(tabContent2.children.length >= 1, 'Variants tab content populated');

console.log('\nTest: selection-driven auto-open fires on module select');
resetPanels();
_resetSelection();
const store = getStore();
store.putPage({ id: 'p-1', path: '/test/', title: 'Test', regionIds: [] });
if (store.activeContext) store.activeContext.page = 'p-1';
store.putModule({
  id: 'm-100',
  moduleId: 'M-heading',
  config: { text: 'Auto-opened', level: 'h2' },
});
_startSelectionAutoOpen();
assert(_panels.size === 0, 'no panel before selection');
getSelection().select({ kind: 'module', id: 'm-100' });
assert(_panels.size === 1, `panel opens on module select (got ${_panels.size})`);
const autoPanel = _panels.get('fvcms-edit-m-100');
assert(autoPanel && autoPanel.id === 'fvcms-edit-m-100', 'panel id matches selected module');
_stopSelectionAutoOpen();

console.log('\nTest: selection-driven auto-open ignores non-module selection');
resetPanels();
_resetSelection();
const store2 = getStore();
store2.putModule({
  id: 'm-200',
  moduleId: 'M-heading',
  config: { text: 'test', level: 'h2' },
});
_startSelectionAutoOpen();
getSelection().select({ kind: 'region', id: 'r-1' });
assert(_panels.size === 0, 'no panel on region select');
_stopSelectionAutoOpen();

console.log('\nTest: startSelectionAutoOpen is idempotent');
_resetSelection();
_startSelectionAutoOpen();
_startSelectionAutoOpen();   // should be no-op
_stopSelectionAutoOpen();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);