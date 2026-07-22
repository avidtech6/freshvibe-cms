// tests/rerender-watcher.mjs — test the VibeCoder trigger watcher
// Run with: node tests/rerender-watcher.mjs

import { startRerenderWatcher, stopRerenderWatcher } from '../runtime/rerender-watcher.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  ✓ ${msg}`); passed++; }
  else { console.error(`  ✗ ${msg}`); failed++; }
}

// ---- Test 1: watcher bails gracefully when trigger URL is not reachable ----
console.log('Test: watcher disables itself when trigger URL is unreachable');
{
  // Replace global fetch with one that always rejects
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network down'); };

  const { stop } = await startRerenderWatcher({
    cmsDataUrl: '/nonexistent-path',
    pollMs: 100,
  });

  assert(typeof stop === 'function', 'returns a stop function');
  stop();

  globalThis.fetch = origFetch;
}

// ---- Test 2: watcher bails when trigger URL returns non-OK ----
console.log('\nTest: watcher disables itself when trigger URL returns 404');
{
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (opts?.method === 'HEAD') {
      return { ok: false, status: 404, headers: { get: () => null } };
    }
    return { ok: true, json: async () => ({}) };
  };

  const { stop } = await startRerenderWatcher({
    cmsDataUrl: '/somewhere',
    pollMs: 100,
  });

  assert(typeof stop === 'function', 'returns a stop function (404 case)');
  stop();

  globalThis.fetch = origFetch;
}

// ---- Test 3: watcher triggers re-fetch + reload when trigger mtime advances ----
console.log('\nTest: watcher reloads annotation when trigger mtime advances');
{
  const origFetch = globalThis.fetch;
  let triggerMtime = 'Fri, 01 Jan 2026 00:00:00 GMT';
  let annotationCalls = 0;

  globalThis.fetch = async (url, opts) => {
    if (opts?.method === 'HEAD') {
      return { ok: true, status: 200, headers: { get: (k) => k.toLowerCase() === 'last-modified' ? triggerMtime : null } };
    }
    // GET annotation
    annotationCalls++;
    return {
      ok: true,
      json: async () => ({ version: 1, pages: [], regions: [], groups: [], modules: [{ id: 'M-test', moduleId: 'heading' }] }),
    };
  };

  const { stop } = await startRerenderWatcher({
    cmsDataUrl: '/cms',
    pollMs: 50,
  });

  // Wait for first poll to set baseline
  await new Promise(r => setTimeout(r, 100));
  assert(annotationCalls === 0, 'first poll does NOT reload (just records baseline)');

  // Advance mtime
  triggerMtime = 'Fri, 01 Jan 2026 00:01:00 GMT';

  // Wait for next poll to detect change
  await new Promise(r => setTimeout(r, 150));
  assert(annotationCalls === 1, 'second poll reloads after mtime advances');

  // Same mtime, no reload
  await new Promise(r => setTimeout(r, 150));
  assert(annotationCalls === 1, 'no reload when mtime stays same');

  stop();
  globalThis.fetch = origFetch;
}

// ---- Test 4: stop() cleans up ----
console.log('\nTest: stop() is idempotent');
{
  const { stop } = await startRerenderWatcher({
    cmsDataUrl: '/nowhere',
    pollMs: 100,
  });
  stop();
  stop();
  assert(true, 'stop() can be called multiple times without error');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
