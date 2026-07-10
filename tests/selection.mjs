// tests/selection.mjs — smoke test for fragment.editor-selection
// Run with: node tests/selection.mjs

// Minimal DOM stub — selection.js touches document.body for data-* hooks
// and dispatches CustomEvent. We provide just enough for the smoke test.
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
  },
  dispatchEvent() { /* noop for smoke */ },
};

import { getSelection, _resetSelection } from '../runtime/selection.js';

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

console.log('Test: singleton via getSelection()');
_resetSelection();
const sel1 = getSelection();
const sel2 = getSelection();
assert(sel1 === sel2, 'getSelection returns same singleton');
assert(typeof globalThis.window === 'undefined' || globalThis.window.FreshVibeCmsSelection === sel1,
  'singleton exposed on window (when window exists)');

console.log('\nTest: initial state');
assert(sel1.get() === null, 'initial selection is null');
assert(global.document.body.dataset.fvcmsSelectedKind === undefined,
  'body has no selected-kind initially');

console.log('\nTest: select({ kind, id })');
sel1.select({ kind: 'module', id: 'm-001' });
assert(sel1.get().kind === 'module', 'kind set to module');
assert(sel1.get().id === 'm-001', 'id set to m-001');
assert(global.document.body.dataset.fvcmsSelectedKind === 'module',
  'body data-fvcms-selected-kind set');
assert(global.document.body.dataset.fvcmsSelectedId === 'm-001',
  'body data-fvcms-selected-id set');

console.log('\nTest: same selection is no-op');
const historyBefore = sel1.state.history.length;
sel1.select({ kind: 'module', id: 'm-001' });
assert(sel1.state.history.length === historyBefore,
  'history does not grow on same-value select');

console.log('\nTest: select different value triggers listeners');
let listenerCalls = 0;
let lastSeen = null;
const unsub = sel1.onChange((current, prev) => {
  listenerCalls++;
  lastSeen = { current, prev };
});
sel1.select({ kind: 'region', id: 'r-001' });
assert(listenerCalls === 1, `listener fired once (got ${listenerCalls})`);
assert(lastSeen.current.kind === 'region' && lastSeen.current.id === 'r-001',
  'listener saw new selection');
assert(lastSeen.prev.kind === 'module' && lastSeen.prev.id === 'm-001',
  'listener saw previous selection');
assert(sel1.state.history.length === historyBefore + 1,
  'history grew by one');

console.log('\nTest: unsubscribe');
unsub();
sel1.select({ kind: 'region', id: 'r-002' });
assert(listenerCalls === 1, `listener NOT fired after unsubscribe (got ${listenerCalls})`);

console.log('\nTest: clear()');
sel1.clear();
assert(sel1.get() === null, 'selection cleared');
assert(global.document.body.dataset.fvcmsSelectedKind === undefined,
  'body data-fvcms-selected-kind removed');
assert(global.document.body.dataset.fvcmsSelectedId === undefined,
  'body data-fvcms-selected-id removed');

console.log('\nTest: undo() restores previous');
_resetSelection();
const sel3 = getSelection();
sel3.select({ kind: 'region', id: 'r-100' });
sel3.select({ kind: 'module', id: 'm-100' });
sel3.select({ kind: 'region', id: 'r-200' });
assert(sel3.get().id === 'r-200', 'current is r-200');
sel3.undo();
assert(sel3.get().id === 'm-100', 'undo restored to m-100');
sel3.undo();
assert(sel3.get().id === 'r-100', 'undo restored to r-100');
sel3.undo();
assert(sel3.get() === null, 'undo at empty history = null');

console.log('\nTest: invalid input rejected');
_resetSelection();
const sel4 = getSelection();
sel4.select({ kind: 'module', id: 'm-1' });
sel4.select({ kind: null, id: null });  // → clear()
assert(sel4.get() === null, 'null/null cleared selection');
sel4.select({ kind: 'module', id: 'm-1' });
sel4.select({ kind: 42, id: 'm-2' });  // bad kind
assert(sel4.get().id === 'm-1', 'non-string kind rejected');
sel4.select({ kind: 'module', id: '' });  // empty id
assert(sel4.get().id === 'm-1', 'empty id rejected');

console.log('\nTest: history cap (20)');
_resetSelection();
const sel5 = getSelection();
for (let i = 0; i < 25; i++) {
  sel5.select({ kind: 'module', id: `m-${i}` });
}
assert(sel5.state.history.length === 20, `history capped at 20 (got ${sel5.state.history.length})`);
assert(sel5.state.history[0].id === 'm-5', `oldest entry is m-5 (got ${sel5.state.history[0].id})`);

console.log('\nTest: withSelection helper');
_resetSelection();
const sel6 = getSelection();
sel6.select({ kind: 'region', id: 'r-9' });
const result = sel6.withSelection(s => s ? s.id.toUpperCase() : 'NONE');
assert(result === 'R-9', `withSelection returns transformed value (got ${result})`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);