// tests/outline.mjs — smoke test for fragment.editor-outline
// Run with: node tests/outline.mjs

// Minimal DOM stub — outline.js touches document.body, createElement,
// getElementById, getBoundingClientRect (returns zeros), CustomEvent.
let _bodyChildren = [];
function createElementStub(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    className: '',
    dataset: {},
    children: [],
    style: {},
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
    setAttribute(k, v) { this[k] = v; },
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    removeChild(child) {
      const i = this.children.indexOf(child);
      if (i >= 0) this.children.splice(i, 1);
      child.parentNode = null;
      return child;
    },
    addEventListener() {},
    querySelector() { return null; },
    getBoundingClientRect() { return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }; },
    dispatchEvent() {},
    isConnected: true,
    parentNode: null,
  };
  return el;
}

global.document = {
  body: {
    dataset: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
    },
    offsetWidth: 100,
    appendChild(child) {
      _bodyChildren.push(child);
      child.parentNode = this;
      return child;
    },
    removeChild(child) {
      const i = _bodyChildren.indexOf(child);
      if (i >= 0) _bodyChildren.splice(i, 1);
      child.parentNode = null;
      return child;
    },
    querySelector() { return null; },
  },
  getElementById(id) {
    return _bodyChildren.find(c => c.id === id) || null;
  },
  createElement: createElementStub,
  createElementNS: createElementStub,
  dispatchEvent() {},
  querySelector(sel) {
    // For our test, return a fake target for the region selector so the outline can spawn a tag.
    if (sel === '#test-region-1') {
      return createElementStub('section');
    }
    return null;
  },
  querySelectorAll() { return []; },
};
global.requestAnimationFrame = (cb) => setTimeout(() => cb(), 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.CustomEvent = function CustomEvent(type, init) {
  this.type = type;
  this.detail = init && init.detail;
};

import { startOutlines, stopOutlines, isOutlinesActive, refreshOutlines, _resetOutlineForTest } from '../runtime/outline.js';
import { _resetSelection, getSelection } from '../runtime/selection.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

console.log('Test: isOutlinesActive default');
_resetOutlineForTest();
assert(isOutlinesActive() === false, 'outlines inactive by default');

console.log('\nTest: startOutlines sets active');
_resetOutlineForTest();
startOutlines();
assert(isOutlinesActive() === true, 'outlines active after startOutlines()');

console.log('\nTest: stopOutlines clears active');
stopOutlines();
assert(isOutlinesActive() === false, 'outlines inactive after stopOutlines()');

console.log('\nTest: startOutlines is idempotent (no double-render leak)');
_resetOutlineForTest();
startOutlines();
const tagsBefore = _bodyChildren.length;
startOutlines();
const tagsAfter = _bodyChildren.length;
assert(tagsBefore === tagsAfter, `calling startOutlines twice does not duplicate tags (${tagsBefore} vs ${tagsAfter})`);

console.log('\nTest: stopOutlines cleans DOM and rAF');
stopOutlines();
const tagsCleared = _bodyChildren.filter(c => c.id === 'fvcms-outline-container').length;
assert(tagsCleared === 0, 'outline container removed from DOM after stopOutlines()');

console.log('\nTest: selection integration — selecting a region adds is-selected to that region tag');
_resetOutlineForTest();
_resetSelection();

// Build a minimal page + region by hand (loadAnnotation isn't available in node test).
// Don't call open() — IndexedDB is undefined in node test env.
// Store constructor sets up activeContext + Maps; in-memory ops work.
import { getStore } from '../runtime/store.js';
const _store = getStore();
_store.putPage({ id: 'p-test', path: '/test/', title: 'Test', regionIds: ['r-test-1'] });
_store.setActivePage && _store.setActivePage('p-test');
_store.putRegion({ id: 'r-test-1', selector: '#test-region-1', label: 'Test region' });
if (_store.activeContext) _store.activeContext.page = 'p-test';

startOutlines();
// Find the outline container
const container = _bodyChildren.find(c => c.id === 'fvcms-outline-container');
assert(container !== undefined, 'outline container exists in DOM');

// Without selection, no is-selected class on any tag
const tagsNoSelection = container ? container.children : [];
const selectedBefore = tagsNoSelection.filter(t => t.classList.contains('is-selected')).length;
assert(selectedBefore === 0, `no tags selected when selection is null (got ${selectedBefore})`);
// Make sure we have tags to highlight (region was added BEFORE startOutlines above).
assert(tagsNoSelection.length >= 1, `at least one tag exists (got ${tagsNoSelection.length})`);

getSelection().select({ kind: 'region', id: 'r-test-1' });

// Allow rAF + queue to settle
await new Promise(r => setTimeout(r, 10));

// Look in the LATEST container — render() may have re-rendered into a new container.
const allContainers = _bodyChildren.filter(c => c.id === 'fvcms-outline-container');
const latestContainer = allContainers[allContainers.length - 1];
const tagsAfterSel = latestContainer ? latestContainer.children : [];
const selectedAfter = tagsAfterSel.filter(t => t.classList.contains('is-selected')).length;
assert(selectedAfter >= 1, `at least one tag is-selected after region select (got ${selectedAfter})`);

const theSelectedTag = tagsAfterSel.find(t => t.classList.contains('is-selected'));
assert(theSelectedTag && theSelectedTag.dataset.regionId === 'r-test-1',
  `selected tag has correct regionId (got ${theSelectedTag && theSelectedTag.dataset.regionId})`);

stopOutlines();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);