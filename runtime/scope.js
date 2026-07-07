// runtime/scope.js — scope resolver
// A Scope is an addressable thing in the store. The resolver returns
// the targets + the ops allowed at that scope.
//
// Scope types:
//   { type: 'page', pageId }
//   { type: 'region', regionId }
//   { type: 'group', groupId }
//   { type: 'module', moduleInstanceId }
//   { type: 'field', moduleInstanceId, field }
//
// Ops allowed:
//   read, rearrange, editContent, create, delete
//
// Rules:
//   page scope    -> read all, rearrange anything, editContent anywhere
//                     (loose, used for "make the page better")
//   region scope  -> read all in region, rearrange groups, editContent
//                     modules in region, create/delete groups in region
//   group scope   -> read all in group, rearrange modules in group,
//                     editContent modules, create/delete modules in group
//   module scope  -> read, editContent (loose across all fields)
//   field scope   -> read, editContent for THIS field only

import { getStore } from './store.js';

export function resolveScope(scope) {
  const store = getStore();
  const targets = [];
  let ops = { read: false, rearrange: false, editContent: false, create: false, delete: false };

  switch (scope.type) {
    case 'page': {
      const page = store.getPage(scope.pageId);
      if (!page) return { targets: [], ops };
      for (const regionId of page.regionIds) {
        const region = store.getRegion(regionId);
        if (!region) continue;
        targets.push({ kind: 'region', region });
        for (const group of store.listGroupsForRegion(regionId)) {
          targets.push({ kind: 'group', group });
          for (const m of store.listModulesForGroup(group.id)) {
            targets.push({ kind: 'module', module: m });
          }
        }
      }
      ops = { read: true, rearrange: true, editContent: true, create: true, delete: true };
      break;
    }

    case 'region': {
      const region = store.getRegion(scope.regionId);
      if (!region) return { targets: [], ops };
      targets.push({ kind: 'region', region });
      for (const group of store.listGroupsForRegion(region.id)) {
        targets.push({ kind: 'group', group });
        for (const m of store.listModulesForGroup(group.id)) {
          targets.push({ kind: 'module', module: m });
        }
      }
      ops = { read: true, rearrange: true, editContent: true, create: true, delete: true };
      break;
    }

    case 'group': {
      const group = store.getGroup(scope.groupId);
      if (!group) return { targets: [], ops };
      targets.push({ kind: 'group', group });
      for (const m of store.listModulesForGroup(group.id)) {
        targets.push({ kind: 'module', module: m });
      }
      ops = { read: true, rearrange: true, editContent: true, create: true, delete: true };
      break;
    }

    case 'module': {
      const m = store.getModule(scope.moduleInstanceId);
      if (!m) return { targets: [], ops };
      targets.push({ kind: 'module', module: m });
      ops = { read: true, rearrange: false, editContent: true, create: false, delete: true };
      break;
    }

    case 'field': {
      const m = store.getModule(scope.moduleInstanceId);
      if (!m) return { targets: [], ops };
      targets.push({ kind: 'field', module: m, field: scope.field });
      ops = { read: true, rearrange: false, editContent: true, create: false, delete: false };
      break;
    }
  }

  return { targets, ops };
}

// Convenience: assert that an op is allowed at the scope.
// Throws if not. Used by the editor before writing.
export function assertOp(scope, opName) {
  const { ops } = resolveScope(scope);
  if (!ops[opName]) {
    throw new Error(`[freshvibe-cms] op "${opName}" not allowed at scope ${scope.type}`);
  }
}