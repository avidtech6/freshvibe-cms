// tests/multi-panel.mjs — verify multi-panel-per-edge behavior
// Per fragment.oscar.panel-manager.001:
//   "Multi-panel per edge supported (one focused at a time)"

import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.CustomEvent = dom.window.CustomEvent;
global.Event = dom.window.Event;

const scriptText = readFileSync(
  'runtime/panel-manager/panel-manager.js',
  'utf8'
);
const fn = new Function('window', 'document', 'HTMLElement', 'CustomEvent', 'Event',
  scriptText + '; return window.PanelManager;');
const PanelManager = fn(window, document, HTMLElement, CustomEvent, Event);

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log('  ✓', name);
    passed++;
  } else {
    console.log('  ✗', name, detail || '');
    failed++;
  }
}

console.log('Test: multi-panel per edge');

const mgr = PanelManager.create();

mgr.addPanel({ id: 'p1', title: 'P1', content: 'a' });
mgr.addPanel({ id: 'p2', title: 'P2', content: 'b' });
mgr.addPanel({ id: 'p3', title: 'P3', content: 'c' });

mgr.dock('p1', 'left');
mgr.dock('p2', 'left');
mgr.dock('p3', 'left');

const list = mgr.list();
check('3 panels registered', list.panels.length === 3, `got ${list.panels.length}`);

const allActive = list.panels.every(p => p.state === 'docked-active');
check('all 3 are docked-active on left', allActive, JSON.stringify(list.panels.map(p => p.state)));

const p1El = document.querySelector('[data-panel-id="p1"]');
const p2El = document.querySelector('[data-panel-id="p2"]');
const p3El = document.querySelector('[data-panel-id="p3"]');

check('p1 left = 0', p1El && p1El.style.left === '0px', `got ${p1El && p1El.style.left}`);
check('p2 left = 376 (360 + 16 dock)', p2El && p2El.style.left === '376px', `got ${p2El && p2El.style.left}`);
check('p3 left = 752', p3El && p3El.style.left === '752px', `got ${p3El && p3El.style.left}`);

// Test focus shift — p1 had focus after its dock() call, shifting to p2 should NOT collapse p1
mgr.activate('p2');
const afterActivate = mgr.list();
const p1State = afterActivate.panels.find(p => p.id === 'p1').state;
const p2State = afterActivate.panels.find(p => p.id === 'p2').state;
check('p1 STAYS docked-active after focusing p2', p1State === 'docked-active', `got ${p1State}`);
check('p2 is docked-active', p2State === 'docked-active', `got ${p2State}`);

// Check focus via the data-focused DOM attribute (the public signal)
const p1FocusedAttr = p1El.dataset.focused;
const p2FocusedAttr = p2El.dataset.focused;
check('p1 lost focus (data-focused=0)', p1FocusedAttr === '0', `got ${p1FocusedAttr}`);
check('p2 has focus (data-focused=1)', p2FocusedAttr === '1', `got ${p2FocusedAttr}`);

// Clicking an already-focused pill should collapse it (user-controlled hide)
mgr.activate('p2');
const p2Final = mgr.list().panels.find(p => p.id === 'p2');
check('clicking focused pill collapses it', p2Final.state === 'docked-collapsed', `got ${p2Final.state}`);

// p1 should still be docked-active (only p2 was collapsed)
const p1Final = mgr.list().panels.find(p => p.id === 'p1');
check('p1 still docked-active after p2 collapsed', p1Final.state === 'docked-active', `got ${p1Final.state}`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
