// runtime/group-toggle.js — manual group → module toggle
// Lets the operator say "this group IS a module" (or isn't) and pick
// which module type it corresponds to. Auto-detect later, suggestion only.

import { getStore } from './store.js';
import { getModuleDef, listModuleDefs } from '../modules/index.js';

export function renderGroupToggleUI() {
  const root = document.createElement('div');
  root.className = 'fvcms-group-toggle';

  const store = getStore();
  const page = store.getPage(store.activeContext.page);
  if (!page) return root;

  for (const regionId of page.regionIds) {
    const region = store.getRegion(regionId);
    const groups = store.listGroupsForRegion(regionId);
    if (groups.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'fvcms-group-section';

    const head = document.createElement('div');
    head.className = 'fvcms-group-section-head';
    head.textContent = region.label || regionId;
    section.appendChild(head);

    for (const group of groups) {
      const row = document.createElement('div');
      row.className = 'fvcms-group-row';

      const label = document.createElement('span');
      label.textContent = group.id;
      label.title = group.metadata?.rawClass || '';
      label.style.cssText = 'flex: 1; font-size: 10px; color: #b0c0b0;';
      row.appendChild(label);

      const select = document.createElement('select');
      select.className = 'fvcms-group-moduleselect';
      select.style.cssText = 'font-size: 10px;';

      const optNone = document.createElement('option');
      optNone.value = '__none__';
      optNone.textContent = '(plain group)';
      select.appendChild(optNone);

      // If currently mapped to a module, mark it
      const currentModule = group.isModule && group.moduleInstanceId
        ? store.getModule(group.moduleInstanceId)
        : null;

      for (const def of listModuleDefs()) {
        const opt = document.createElement('option');
        opt.value = def.id;
        opt.textContent = def.label;
        if (currentModule && currentModule.moduleId === def.id) opt.selected = true;
        select.appendChild(opt);
      }
      if (!group.isModule) optNone.selected = true;

      select.addEventListener('change', () => {
        toggleGroupToModule(group.id, select.value === '__none__' ? null : select.value);
      });

      row.appendChild(select);
      section.appendChild(row);
    }
    root.appendChild(section);
  }
  return root;
}

/**
 * Convert a plain group into a module instance (or detach if null).
 * When promoting to a module, the module instance is created with the
 * default config of the chosen module type.
 */
export async function toggleGroupToModule(groupId, moduleId) {
  const store = getStore();
  const group = store.getGroup(groupId);
  if (!group) return;

  if (!moduleId) {
    // Demote: remove the module instance + mark group as plain
    if (group.isModule && group.moduleInstanceId) {
      const m = store.getModule(group.moduleInstanceId);
      if (m && m.el && m.el.parentNode) m.el.parentNode.removeChild(m.el);
      store.modules.delete(group.moduleInstanceId);
    }
    group.isModule = false;
    group.moduleInstanceId = null;
    return;
  }

  // Promote or switch type
  if (group.isModule && group.moduleInstanceId) {
    const m = store.getModule(group.moduleInstanceId);
    if (m) {
      const def = getModuleDef(moduleId);
      m.moduleId = moduleId;
      m.config = { ...def.defaultConfig };
    }
  } else {
    // Create new module instance
    const def = getModuleDef(moduleId);
    const moduleInstanceId = `MI-${groupId.replace(/^G-/, '')}`;
    group.isModule = true;
    group.moduleInstanceId = moduleInstanceId;
    const m = {
      id: moduleInstanceId,
      moduleId,
      groupId,
      selector: group.selector,
      config: { ...def.defaultConfig },
      metadata: { promotedFromGroup: true },
    };
    store.putModule(m);
    // Attach DOM and render
    await import('./renderer.js').then(({ connect }) => {
      const el = document.querySelector(group.selector);
      if (el) connect(moduleInstanceId, el);
    });
  }
}