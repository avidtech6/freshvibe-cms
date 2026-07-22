// runtime/rerender-watcher.js — Watch for VibeCoder PATCH signals
//
// When the VibeCoder bridge mutates annotation.json (via PATCH
// /api/agent/freshvibe-apps/:name/regions/:id or /modules/:id), it
// also drops a `.rerender-trigger` file in cms-data/ as a signal:
// "the annotation changed, please re-paint".
//
// This module polls the trigger file's mtime. When it advances,
// it re-fetches annotation.json, re-loads it into the store, and
// re-renders all modules.
//
// Usage:
//   import { startRerenderWatcher, stopRerenderWatcher } from './rerender-watcher.js';
//   await startRerenderWatcher({ pollMs: 2000 });
//
// The trigger URL is `${cmsDataUrl}/.rerender-trigger` and the
// annotation is `${cmsDataUrl}/annotation.json`. The cmsDataUrl
// defaults to "./app-fragments/cms-data" (matches the canonical
// Oscar install) but can be overridden.
//
// The watcher is a no-op if the trigger URL is not reachable
// (e.g. local file:// or different deploy layout). It logs
// once and exits silently.

import { getStore } from './store.js';
import { loadAnnotation } from './load-annotation.js';
import { renderAll } from './renderer.js';

let _interval = null;
let _lastTriggerSeen = null;
let _started = false;

/**
 * Start polling for the rerender trigger.
 *
 * @param {Object} opts
 * @param {string} [opts.cmsDataUrl] - URL prefix for cms-data files. Default './app-fragments/cms-data'.
 * @param {number} [opts.pollMs=2000] - Poll interval in ms. Default 2 seconds.
 * @param {string} [opts.annotationUrl] - Full URL to annotation.json. Default `${cmsDataUrl}/annotation.json`.
 * @returns {Promise<{stop: () => void}>}
 */
export async function startRerenderWatcher(opts = {}) {
  if (_started) {
    console.warn('[rerender-watcher] already started, ignoring duplicate start');
    return { stop: stopRerenderWatcher };
  }

  const cmsDataUrl = opts.cmsDataUrl || './app-fragments/cms-data';
  const pollMs = opts.pollMs || 2000;
  const triggerUrl = `${cmsDataUrl}/.rerender-trigger`;
  const annotationUrl = opts.annotationUrl || `${cmsDataUrl}/annotation.json`;

  // First check: can we reach the trigger URL at all? If not, bail.
  try {
    const r = await fetch(triggerUrl, { method: 'HEAD', cache: 'no-store' });
    if (!r.ok) {
      console.log('[rerender-watcher] trigger URL not reachable (status', r.status, '), watcher disabled');
      return { stop: () => {} };
    }
  } catch (e) {
    console.log('[rerender-watcher] trigger URL fetch failed:', e.message, '— watcher disabled');
    return { stop: () => {} };
  }

  _started = true;
  console.log(`[rerender-watcher] started, polling ${triggerUrl} every ${pollMs}ms`);

  _interval = setInterval(async () => {
    try {
      // HEAD the trigger to get its mtime without downloading the body
      const r = await fetch(triggerUrl, { method: 'HEAD', cache: 'no-store' });
      if (!r.ok) return; // not reachable this tick, try again next tick

      const lastModified = r.headers.get('last-modified') || r.headers.get('etag') || '';
      if (!lastModified) return; // no signal we can use
      if (lastModified === _lastTriggerSeen) return; // no change

      // First poll: just record the current mtime, don't reload (avoids
      // an unnecessary reload at boot time when annotation is already loaded).
      if (_lastTriggerSeen === null) {
        _lastTriggerSeen = lastModified;
        return;
      }

      // Trigger advanced → reload annotation + re-render
      _lastTriggerSeen = lastModified;
      console.log('[rerender-watcher] trigger changed, reloading annotation');

      const annResp = await fetch(annotationUrl, { cache: 'no-store' });
      if (!annResp.ok) {
        console.warn('[rerender-watcher] annotation fetch failed:', annResp.status);
        return;
      }
      const annotation = await annResp.json();

      // Reload into store
      const store = getStore();
      const ok = loadAnnotation(annotation);
      if (ok) {
        // Re-render all modules
        renderAll();
        console.log('[rerender-watcher] re-painted', ok.modules, 'modules');
      }
    } catch (e) {
      // Polling failures are non-fatal — log and keep going
      console.warn('[rerender-watcher] poll error:', e.message);
    }
  }, pollMs);

  return { stop: stopRerenderWatcher };
}

export function stopRerenderWatcher() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
  _started = false;
  _lastTriggerSeen = null;
  console.log('[rerender-watcher] stopped');
}

export function isRerenderWatcherActive() {
  return _started;
}
