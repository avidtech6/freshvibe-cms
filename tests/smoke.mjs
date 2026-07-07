// tests/smoke.mjs — smoke test for FreshVibe CMS runtime
// Run with: node tests/smoke.mjs

import { detectElementor } from '../detectors/elementor.js';
import { getModuleDef, listModuleDefs } from '../modules/index.js';
import { listSampleSkins } from '../skins/index.js';
import { reignSkin } from '../skins/reign.js';
import { buddyxSkin } from '../skins/buddYx.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

console.log('Test: module library');
const defs = listModuleDefs();
assert(defs.length === 15, `15 modules loaded (got ${defs.length})`);
const moduleIds = ['M-heading', 'M-cta', 'M-image', 'M-paragraph', 'M-video',
                  'M-carousel', 'M-menu', 'M-social-icons', 'M-accordion', 'M-icon-list',
                  'M-info-box', 'M-contact-form', 'M-breadcrumb', 'M-testimonial', 'M-cta-box'];
for (const id of moduleIds) {
  const d = getModuleDef(id);
  assert(!!d, `${id} exists`);
  assert(!!d.schema, `${id} has schema`);
  assert(!!d.defaultConfig, `${id} has defaultConfig`);
  assert(!!d.editor, `${id} has editor id (${d.editor})`);
}

console.log('\nTest: variants (where defined)');
for (const d of defs) {
  if (d.id === 'M-breadcrumb') continue; // no variants — that's fine
  assert(d.variants && d.variants.length > 0, `${d.id} has variants`);
}

console.log('\nTest: scope resolver (pure logic, no IndexedDB)');
const heading = getModuleDef('M-heading');
assert(heading.variants.length >= 3, `heading has variants (got ${heading.variants.length})`);
const cta = getModuleDef('M-cta');
assert(cta.variants.length >= 3, `cta has variants (got ${cta.variants.length})`);

console.log('\nTest: detector with sample HTML');
const sampleHtml = `
<html><body>
<div class="e-con e-parent" data-id="r1">
  <div class="elementor-element elementor-element-abc123" data-id="abc123" data-element_type="widget" data-widget_type="heading.default" data-settings="{&quot;title&quot;:&quot;Hello World&quot;,&quot;header_size&quot;:&quot;2&quot;}">
    <div class="elementor-widget-container">
      <h2>Hello World</h2>
    </div>
  </div>
  <div class="elementor-element elementor-element-def456" data-id="def456" data-element_type="widget" data-widget_type="button.default" data-settings="{&quot;text&quot;:&quot;Click me&quot;,&quot;link&quot;:{&quot;url&quot;:&quot;/about&quot;}}">
    <div class="elementor-widget-container">
      <a href="/about">Click me</a>
    </div>
  </div>
</div>
</body></html>
`;
const result = detectElementor({ pathname: '/test/', html: sampleHtml });
assert(result.pages.length === 1, `1 page detected (got ${result.pages.length})`);
assert(result.regions.length === 1, `1 region detected (got ${result.regions.length})`);
assert(result.modules.length === 2, `2 modules detected (got ${result.modules.length})`);

const headingModule = result.modules.find(m => m.moduleId === 'M-heading');
assert(!!headingModule, `heading module mapped`);
if (headingModule) {
  assert(headingModule.config.text === 'Hello World', `heading text extracted: "${headingModule.config.text}"`);
  assert(headingModule.config.level === 'h2', `heading level extracted: ${headingModule.config.level}`);
}

const ctaModule = result.modules.find(m => m.moduleId === 'M-cta');
assert(!!ctaModule, `cta module mapped`);
if (ctaModule) {
  assert(ctaModule.config.text === 'Click me', `cta text extracted: "${ctaModule.config.text}"`);
  assert(ctaModule.config.href === '/about', `cta href extracted: ${ctaModule.config.href}`);
}

console.log('\nTest: detector handles unknown widget types');
const mixedHtml = `
<div class="e-con e-parent">
  <div class="elementor-element elementor-element-foo" data-id="foo" data-element_type="widget" data-widget_type="weird-widget.unknown">
  </div>
  <div class="elementor-element elementor-element-bar" data-id="bar" data-element_type="widget" data-widget_type="heading.default" data-settings="{&quot;title&quot;:&quot;Real heading&quot;}">
    <h2>Real heading</h2>
  </div>
</div>
`;
const mixed = detectElementor({ pathname: '/mix/', html: mixedHtml });
assert(mixed.modules.length === 1, `unknown widget skipped (got ${mixed.modules.length} modules)`);
assert(mixed.modules[0].config && mixed.modules[0].config.text === 'Real heading', 'known widget still detected');

console.log('\nTest: skins');
const skins = listSampleSkins();
assert(skins.length === 2, `2 sample skins (got ${skins.length})`);
for (const skin of skins) {
  assert(!!skin.id, `${skin.id || '(unnamed)'} has id`);
  assert(!!skin.label, `${skin.id || '(unnamed)'} has label`);
  assert(!!skin.cssTokens && Object.keys(skin.cssTokens).length > 0, `${skin.id} has CSS tokens`);
  assert(!!skin.moduleDefaults && Object.keys(skin.moduleDefaults).length > 0, `${skin.id} has module defaults`);
}

console.log('\nTest: skin token shape');
assert(reignSkin.cssTokens['--cta-radius'] === '4px', `Reign has sharp cta-radius (4px)`);
assert(buddyxSkin.cssTokens['--cta-radius'] === '24px', `BuddyX has rounded cta-radius (24px)`);

console.log('\nTest: annotation.json exists and is well-formed');
const annotationPath = path.join(__dirname, '..', 'annotation.json');
if (fs.existsSync(annotationPath)) {
  const ann = JSON.parse(fs.readFileSync(annotationPath, 'utf8'));
  assert(ann.version === 1, `version is 1`);
  assert(ann.pages.length > 0, `has pages (${ann.pages.length})`);
  assert(ann.regions.length > 0, `has regions (${ann.regions.length})`);
  assert(ann.modules.length > 0, `has modules (${ann.modules.length})`);
  const moduleIds = ann.modules.map(m => m.id);
  assert(new Set(moduleIds).size === moduleIds.length, `all module IDs unique`);
  // Quick sanity: count modules that mapped to known types
  const knownTypes = ann.modules.filter(m => m.moduleId !== undefined).length;
  assert(knownTypes > 200, `most modules mapped (${knownTypes}/${ann.modules.length})`);
} else {
  console.log('  - annotation.json not found, skipping');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);