// scripts/annotate.js — annotation generator
//
// Scans a dist directory of HTML pages, runs the Elementor detector
// on each, emits an annotation.json that the runtime can load on
// page boot.
//
// Usage:
//   node scripts/annotate.js <dist-dir> <output-file>
//
// Example:
//   node scripts/annotate.js ../oscar-web/dist annotation.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectElementor } from '../detectors/elementor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const distDir = process.argv[2];
  const outFile = process.argv[3];
  if (!distDir || !outFile) {
    console.error('Usage: node scripts/annotate.js <dist-dir> <output-file>');
    process.exit(1);
  }
  const resolvedDist = path.resolve(distDir);
  const resolvedOut = path.resolve(outFile);

  const htmlFiles = findHtmlFiles(resolvedDist);
  console.log(`[annotate] scanning ${htmlFiles.length} HTML files in ${resolvedDist}`);

  const allPages = [];
  const allRegions = [];
  const allGroups = [];
  const allModules = [];
  const unsupported = new Set();

  for (const file of htmlFiles) {
    const pathname = pathToPathname(file, resolvedDist);
    const html = fs.readFileSync(file, 'utf8');
    const result = detectElementor({ pathname, html });
    allPages.push(...result.pages);
    allRegions.push(...result.regions);
    allGroups.push(...result.groups);
    allModules.push(...result.modules);

    // Track unsupported widget types so we know what to add next.
    const types = new Set();
    const re = /elementor-widget-([a-z0-9-]+)/g;
    let m;
    while ((m = re.exec(html)) !== null) types.add(m[1]);
    types.forEach(t => {
      const mapped = ['heading','button','image','text-editor','video',
        'animated-headline','eael-creative-button','eael-image','eael-video',
        'eael-post-carousel','eael-team-member-carousel','eael-stacked-cards',
        'eael-simple-menu','social-icons','eael-adv-accordion','eael-toggle',
        'icon-list'].includes(t);
      if (!mapped) unsupported.add(t);
    });
  }

  const annotation = {
    version: 1,
    generated: new Date().toISOString(),
    pages: allPages,
    regions: allRegions,
    groups: allGroups,
    modules: allModules,
    meta: {
      totalPages: allPages.length,
      totalRegions: allRegions.length,
      totalGroups: allGroups.length,
      totalModules: allModules.length,
      unsupportedWidgets: Array.from(unsupported).sort(),
    },
  };

  fs.writeFileSync(resolvedOut, JSON.stringify(annotation, null, 2));
  console.log(`[annotate] wrote ${resolvedOut}`);
  console.log(`[annotate] ${annotation.meta.totalPages} pages, ${annotation.meta.totalRegions} regions, ${annotation.meta.totalGroups} groups, ${annotation.meta.totalModules} modules`);
  if (unsupported.size > 0) {
    console.log(`[annotate] unsupported widget types (not in canonical library yet):`);
    for (const t of unsupported) console.log(`           - ${t}`);
  }
}

function findHtmlFiles(dir) {
  const out = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name === 'index.html') out.push(full);
    }
  }
  walk(dir);
  return out.sort();
}

function pathToPathname(file, distDir) {
  const rel = path.relative(distDir, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  return '/' + rel.replace(/\/index\.html$/, '/');
}

main().catch(e => {
  console.error('[annotate] error:', e);
  process.exit(1);
});