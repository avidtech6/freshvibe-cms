// runtime/query.js — queryable scope API
// Lets AI / UI ask questions like:
//   - "find all CTA modules with text matching 'Learn more'"
//   - "list all regions on this page"
//   - "which modules would be affected if I add a new heading here?"
//   - "show me the config of every heading module across the whole site"
//
// All queries return QueryResult objects with id + label + scope type,
// so the caller can produce a UI or pass scopes to AI.

import { getStore } from './store.js';
import { getModuleDef } from '../modules/index.js';

export function query(opts) {
  const store = getStore();
  const results = [];

  if (!opts || Object.keys(opts).length === 0) {
    return { results: [], count: 0 };
  }

  // Filter by module type
  if (opts.moduleId) {
    const moduleDef = getModuleDef(opts.moduleId);
    if (!moduleDef) return { results: [], count: 0 };
    for (const [id, m] of store.modules) {
      if (m.moduleId !== opts.moduleId) continue;
      if (opts.where && !checkWhere(m.config, opts.where)) continue;
      if (opts.pageId && store.getPage(opts.pageId)?.id !== getPageForModule(id)) continue;
      results.push({
        scopeType: 'module',
        scope: { type: 'module', moduleInstanceId: id },
        id,
        label: describeModule(m, moduleDef),
      });
    }
    return { results, count: results.length };
  }

  // Filter by region
  if (opts.regionId) {
    const region = store.getRegion(opts.regionId);
    if (!region) return { results: [], count: 0 };
    results.push({
      scopeType: 'region',
      scope: { type: 'region', regionId: region.id },
      id: region.id,
      label: region.label || region.id,
    });
    return { results, count: results.length };
  }

  // List regions for the active page (or a specified page)
  if (opts.listRegions) {
    const page = opts.pageId
      ? store.getPage(opts.pageId)
      : store.getPage(store.activeContext.page);
    if (!page) return { results: [], count: 0 };
    for (const regionId of page.regionIds) {
      const region = store.getRegion(regionId);
      if (!region) continue;
      results.push({
        scopeType: 'region',
        scope: { type: 'region', regionId: region.id },
        id: region.id,
        label: region.label || region.id,
      });
    }
    return { results, count: results.length };
  }

  // List pages
  if (opts.listPages) {
    for (const [id, p] of store.pages) {
      results.push({
        scopeType: 'page',
        scope: { type: 'page', pageId: p.id },
        id,
        label: p.label || p.pathname,
      });
    }
    return { results, count: results.length };
  }

  return { results: [], count: 0 };
}

// "where" filters: { text: 'Learn', src: 'https://...' } — substring match
function checkWhere(config, where) {
  for (const [field, expected] of Object.entries(where)) {
    const actual = config[field];
    if (actual == null) return false;
    if (typeof expected === 'string') {
      if (typeof actual === 'string') {
        if (!actual.toLowerCase().includes(expected.toLowerCase())) return false;
      } else if (typeof actual === 'object' && actual.url) {
        if (!actual.url.toLowerCase().includes(expected.toLowerCase())) return false;
      } else {
        return false;
      }
    } else if (typeof expected === 'object' && expected.regex) {
      const re = new RegExp(expected.regex);
      const str = typeof actual === 'string' ? actual : (actual?.url || '');
      if (!re.test(str)) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

function getPageForModule(moduleInstanceId) {
  const store = getStore();
  const m = store.getModule(moduleInstanceId);
  if (!m) return null;
  const group = store.getGroup(m.groupId);
  if (!group) return null;
  const region = store.getRegion(group.regionId);
  if (!region) return null;
  return region.pageId;
}

function describeModule(m, def) {
  const text = m.config.text || m.config.label || m.config.title || '';
  const summary = text ? ` — "${text.length > 30 ? text.slice(0, 30) + '…' : text}"` : '';
  return `${def.label}${summary}`;
}