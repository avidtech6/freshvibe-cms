// tests/colors-and-drilldown.mjs — verify the FES tag colors and drill-down
//
// Per I-015: tag colors are locked
//   - Yellow #ffdc64 = CMS-level pills in the dock
//   - Brown #a06a3a = Region tags on the page
//   - Purple #a878e8 = Widget sub-tags inside a region
//
// Per I-016: drill-down navigation
//   - In dev mode, region tags are visible
//   - Click a region tag, its area gets a brown highlight, widget sub-tags
//     inside that region become visible, other regions' widget sub-tags
//     stay hidden
//   - Click a widget sub-tag, the widget panel opens

import { readFileSync } from 'node:fs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { console.log('  ✓', name); passed++; }
  else { console.log('  ✗', name, detail || ''); failed++; }
}

console.log('Test: I-015 tag colors and I-016 drill-down');

// I-015: check the CSS contains the right hex values for the right elements
const css = readFileSync('runtime/styles.css', 'utf8');

// Region tag should have brown (#a06a3a or related shades)
check('I-015a: region tag background is brownish',
  /fvcms-region-tag\s*\{[^}]*background:.*?(rgba\(60, 40, 25|rgba\(80, 50, 30|#a06a3a)/s.test(css),
  'expected brown shades in .fvcms-region-tag'
);
check('I-015b: region tag selected state is brighter brown',
  /fvcms-region-tag\.is-selected\s*\{[^}]*background:.*?(rgba\(80, 50, 30|#a06a3a)/s.test(css),
  'expected brown selected state'
);

// Module tag should have purple (#a878e8 or related shades)
check('I-015c: module tag background is purplish',
  /fvcms-module-tag\s*\{[^}]*background:.*?(rgba\(45, 30, 65|rgba\(80, 50, 120|#a878e8)/s.test(css),
  'expected purple shades in .fvcms-module-tag'
);
check('I-015d: module tag selected state is brighter purple',
  /fvcms-module-tag\.is-selected\s*\{[^}]*background:.*?(rgba\(80, 50, 120|#a878e8)/s.test(css),
  'expected purple selected state'
);

// Region tags are visible by default in dev mode
// Module tags are only visible when their region is selected
// (drill-down per I-016)
const outline = readFileSync('runtime/outline.js', 'utf8');
check('I-016a: outline has drill-down logic (module tags conditional on region selection)',
  /spawnModuleTags[\s\S]*?if\s*\(\s*!\s*selection\s*\|\|\s*selection\.kind\s*!==\s*['"]region['"]/.test(outline),
  'expected spawnModuleTags to gate on region selection'
);

// Tag handlers set selection (which triggers installEditor.createXPanel)
check('I-016b: outline region click sets selection',
  /attachClickRegion[\s\S]*?sel\.select\(\s*\{\s*kind:\s*['"]region['"]\s*,\s*id:\s*regionId\s*\}/.test(outline),
  'expected region click to call sel.select({ kind: "region", ... })'
);
check('I-016c: outline module click sets selection',
  /attachClickModule[\s\S]*?sel\.select\(\s*\{\s*kind:\s*['"]module['"]\s*,\s*id:\s*moduleId\s*\}/.test(outline),
  'expected module click to call sel.select({ kind: "module", ... })'
);

// install-editor routes selection to host callbacks
const install = readFileSync('runtime/install-editor.js', 'utf8');
check('I-016d: installEditor calls createModulePanel on module selection',
  /current\.kind\s*===\s*['"]module['"]/.test(install) && /createModulePanel\(current\.id\)/.test(install),
  'expected install-editor to call createModulePanel on module selection'
);
check('I-016e: installEditor calls createRegionPanel on region selection',
  /current\.kind\s*===\s*['"]region['"]/.test(install) && /createRegionPanel\(current\.id\)/.test(install),
  'expected install-editor to call createRegionPanel on region selection'
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
