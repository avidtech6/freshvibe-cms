// tests/breadcrumb.mjs — smoke test for fragment.editor-breadcrumb
// Run with: node tests/breadcrumb.mjs

function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    className: '',
    children: [],
    style: {},
    dataset: {},
    id: '',
    attributes: {},
    parentNode: null,
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
    setAttribute(k, v) { this.attributes[k] = v; this.dataset[k.toLowerCase().replace(/-([a-z])/g, (_,c)=>c.toUpperCase())] = v; },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i>=0)this.children.splice(i,1); c.parentNode=null; return c; },
    insertBefore(n, r) { const idx = r ? this.children.indexOf(r) : this.children.length; this.children.splice(idx, 0, n); n.parentNode = this; return n; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    getBoundingClientRect() { return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }; },
    dispatchEvent() {},
    remove() {},
  };
  Object.defineProperty(el, 'firstChild', { get() { return this.children[0] || null; } });
  return el;
}

// Track all click handlers so we can fire them in tests.
const _globalClickHandlers = new WeakMap();
const _origCreateElement = makeEl;
const _origMake = (tag) => {
  const el = makeEl(tag);
  const orig = el.addEventListener;
  el.addEventListener = (event, fn) => {
    if (event === 'click') _globalClickHandlers.set(el, fn);
    return orig.call(el, event, fn);
  };
  return el;
};

global.document = {
  body: makeEl('body'),
  head: { appendChild() {} },
  querySelector() { return null; },
  createElement: _origMake,
  createElementNS: _origMake,
  getElementById() { return null; },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
};
global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  dispatchEvent() {},
  addEventListener() {},
  removeEventListener() {},
};
global.CustomEvent = function(t, init) { this.type = t; this.detail = init && init.detail; };

import { mountBreadcrumb, unmountBreadcrumb, isBreadcrumbMounted, _resetBreadcrumbForTest } from '../runtime/breadcrumb.js';
import { _resetSelection, getSelection } from '../runtime/selection.js';
import { getStore } from '../runtime/store.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  ✓ ${msg}`); passed++; }
  else { console.error(`  ✗ ${msg}`); failed++; }
}

console.log('Test: isBreadcrumbMounted default');
_resetBreadcrumbForTest();
assert(isBreadcrumbMounted() === false, 'not mounted by default');

console.log('\nTest: mountBreadcrumb creates the bar');
_resetBreadcrumbForTest();
const parent = makeEl('div');
mountBreadcrumb(parent);
assert(isBreadcrumbMounted() === true, 'mounted');
assert(parent.children.length === 1, '1 child on parent');
const bar = parent.children[0];
assert(bar.className === 'fvcms-breadcrumb', 'has fvcms-breadcrumb class');

console.log('\nTest: bar shows page segment');
_resetBreadcrumbForTest();
const store = getStore();
store.putPage({ id: 'p-1', path: '/', title: 'Home', regionIds: [] });
store.activeContext.page = 'p-1';
const parent2 = makeEl('div');
mountBreadcrumb(parent2);
const bar2 = parent2.children[0];
assert(bar2.children.length >= 1, `bar has segments (got ${bar2.children.length})`);
const firstSeg = bar2.children.find(c => c.className === 'fvcms-breadcrumb-segment');
assert(firstSeg !== undefined, 'first segment is a button');
assert(firstSeg.textContent === 'Home', `first segment shows page title (got "${firstSeg.textContent}")`);

console.log('\nTest: selecting a region adds region segment');
_resetBreadcrumbForTest();
const parent3 = makeEl('div');
mountBreadcrumb(parent3);
const bar3 = parent3.children[0];
store.putRegion({ id: 'r-1', selector: '#r1', label: 'Hero' });
getSelection().select({ kind: 'region', id: 'r-1' });
const segs3 = bar3.children.filter(c => c.className === 'fvcms-breadcrumb-segment');
assert(segs3.length >= 2, `region adds a segment (got ${segs3.length})`);
assert(segs3.some(s => s.textContent === 'Hero'), 'Hero segment present');
const heroSeg = segs3.find(s => s.textContent === 'Hero');
assert(heroSeg.classList.contains('is-current'), 'Hero segment is current');

console.log('\nTest: selecting a module adds region + group + module segments');
_resetBreadcrumbForTest();
const parent4 = makeEl('div');
mountBreadcrumb(parent4);
const bar4 = parent4.children[0];
store.putGroup({ id: 'g-1', regionId: 'r-1', label: 'Main', groupType: 'section' });
store.putModule({
  id: 'm-1', moduleId: 'M-heading',
  groupId: 'g-1', config: { text: 'Hello' },
  displayLabel: 'Greeting heading',
});
getSelection().select({ kind: 'module', id: 'm-1' });
const segs4 = bar4.children.filter(c => c.className === 'fvcms-breadcrumb-segment');
const segTexts = segs4.map(s => s.textContent);
assert(segTexts.includes('Home'), `path includes page (got ${JSON.stringify(segTexts)})`);
assert(segTexts.includes('Hero'), 'path includes region');
assert(segTexts.includes('Main'), 'path includes group');
assert(segTexts.includes('Greeting heading'), 'path includes module displayLabel');
const moduleSeg = segs4.find(s => s.textContent === 'Greeting heading');
assert(moduleSeg.classList.contains('is-current'), 'module segment is current');
const pageSeg = segs4.find(s => s.textContent === 'Home');
assert(!pageSeg.classList.contains('is-current'), 'page segment is NOT current');

console.log('\nTest: separators between segments');
_resetBreadcrumbForTest();
const parent5 = makeEl('div');
mountBreadcrumb(parent5);
getSelection().select({ kind: 'module', id: 'm-1' });
const bar5 = parent5.children[0];
const seps = bar5.children.filter(c => c.className === 'fvcms-breadcrumb-separator');
const segCount = bar5.children.filter(c => c.className === 'fvcms-breadcrumb-segment').length;
assert(seps.length === segCount - 1, `${seps.length} separators for ${segCount} segments`);

console.log('\nTest: clicking a segment updates selection');
_resetBreadcrumbForTest();
_resetSelection();
const parent6 = makeEl('div');
mountBreadcrumb(parent6);
getSelection().select({ kind: 'module', id: 'm-1' });
const bar6 = parent6.children[0];
const heroSeg6 = bar6.children.find(c => c.textContent === 'Hero' && c.className === 'fvcms-breadcrumb-segment');
const handler = _globalClickHandlers.get(heroSeg6);
assert(typeof handler === 'function', 'Hero segment click handler wired');
handler({ preventDefault(){}, stopPropagation(){} });
assert(getSelection().get().kind === 'region' && getSelection().get().id === 'r-1',
  `selection updated to {kind:'region', id:'r-1'} (got ${JSON.stringify(getSelection().get())})`);

console.log('\nTest: unmountBreadcrumb removes bar');
_resetBreadcrumbForTest();
const parent7 = makeEl('div');
mountBreadcrumb(parent7);
assert(isBreadcrumbMounted() === true, 'mounted');
unmountBreadcrumb();
assert(isBreadcrumbMounted() === false, 'unmounted');
assert(parent7.children.length === 0, 'bar removed from parent');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);