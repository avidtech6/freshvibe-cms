// tests/breadcrumb-mount.mjs — verify breadcrumb mounts/unmounts on setDevMode
//
// Per the plan: when dev mode is on, the breadcrumb is visible at
// the bottom of the page. When dev mode is off, it's gone.

import { readFileSync } from 'node:fs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { console.log('  ✓', name); passed++; }
  else { console.log('  ✗', name, detail || ''); failed++; }
}

console.log('Test: breadcrumb mounts on setDevMode(true)');

const install = readFileSync('runtime/install-editor.js', 'utf8');
const breadcrumb = readFileSync('runtime/breadcrumb.js', 'utf8');

// install-editor calls mountBreadcrumb when dev mode is on
check('install-editor calls mountBreadcrumb on setDevMode(true)',
  /function\s+setDevMode[\s\S]{0,800}mountBreadcrumb/.test(install),
  'expected mountBreadcrumb in setDevMode function body'
);

// install-editor calls unmountBreadcrumb on setDevMode(false)
check('install-editor calls unmountBreadcrumb on setDevMode(false)',
  /function\s+setDevMode[\s\S]{0,1500}unmountBreadcrumb/.test(install),
  'expected unmountBreadcrumb in setDevMode function body'
);

// Breadcrumb has the public API the host expects
check('breadcrumb exports mountBreadcrumb, unmountBreadcrumb',
  /export\s*\{[^}]*mountBreadcrumb[\s\S]*?unmountBreadcrumb[\s\S]*?\}\s*from\s*['"]\.\/breadcrumb\.js['"]/.test(
    readFileSync('runtime/index.js', 'utf8')
  ),
  'expected breadcrumb API in runtime/index.js barrel'
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
