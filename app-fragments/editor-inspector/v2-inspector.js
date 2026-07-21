// v2-inspector.js — World-class form renderer for the FreshVibe CMS editor.
// Replaces the flat form-editor.js with a 3-column drawer (rail / preview / panels)
// using 24 world-class controls (FvW v8-aligned, append-only modules).
//
// This is THE FORM RENDERER, not a parallel inspector. It plugs into the
// canonical editor-shell.js via openEditorShell(). The data path is:
//   page widget click → openInspector → v2Inspect({...})
//   v2Inspect reads FES spec, adapts to shell shape, calls FES_SHELL_V2.open()
//   onChange → adapter.write + getStore().putModule + renderModule
//
// Per app-pact §3.9: this is the public entry point.

import { getStore } from '../oscar-cms-panel/runtime/store.js';
import { getModuleDef } from '../oscar-cms-panel/runtime/index.js';

const SHELL_URL = new URL('./shell-v2.html', import.meta.url).href;
const FES_BASE = '/app-fragments/fes-modules';
const FES_INDEX = `${FES_BASE}/index.json`;

// Cached FES module index + spec cache
let _fesIndex = null;
let _fesCache = {};

async function loadFesIndex() {
  if (_fesIndex) return _fesIndex;
  try {
    const resp = await fetch(FES_INDEX);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _fesIndex = await resp.json();
    return _fesIndex;
  } catch (e) {
    return null;
  }
}

async function loadFesSpec(typeKey) {
  if (!typeKey) return null;
  if (_fesCache[typeKey]) return _fesCache[typeKey];
  try {
    const resp = await fetch(`${FES_BASE}/${typeKey}.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const spec = await resp.json();
    _fesCache[typeKey] = spec;
    return spec;
  } catch (e) {
    return null;
  }
}

function typeKeyFromWidgetType(widgetType) {
  if (!widgetType) return null;
  return widgetType.replace(/\./g, '-');
}

function nameToLabel(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/_/g, ' ');
  s = s.replace(/([a-z])([A-Z])/g, '$1 $2');
  s = s.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function deepGet(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function deepSet(obj, path, value) {
  if (!obj || !path) return;
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// Map FES spec group → shell tab name
const TAB_MAP = {
  CONTENT: 'settings', LAYOUT: 'settings', OTHER: 'settings',
  STYLE: 'style', TYPOGRAPHY: 'style', BACKGROUND: 'style',
  BORDER: 'style', BOX_SHADOW: 'style',
  ADVANCED: 'advanced', MOTION_EFFECTS: 'advanced', CUSTOM_CSS: 'advanced',
  RESPONSIVE: 'advanced', POSITION: 'advanced', ATTRIBUTES: 'advanced',
};
function tabForGroup(groupName) {
  return TAB_MAP[(groupName || '').toUpperCase()] || 'settings';
}

function mapFesTypeToControlType(f) {
  const t = (f.type || 'text').toLowerCase();
  if (t === 'string') return 'text';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'switch';
  if (t === 'color') return 'color';
  if (t === 'url') return 'text';
  if (t === 'image') return 'text';
  if (t === 'select') return 'dropdown';
  if (t === 'array') return 'tags';
  if (t === 'object') return 'textarea';
  return t;
}

// Adapt a FES spec into the shell's expected { structure.sections[], inspector{tab: {groups: []}} } shape
function adaptSpecForV2(fesSpec, moduleDef) {
  const fieldSchema = (fesSpec && fesSpec.fieldSchema) || (moduleDef && moduleDef.schema) || {};
  const inspector = (fesSpec && fesSpec.inspector) || null;

  // Build sections: one section per FES group, or single section from moduleDef
  const sections = [];
  const inspectorTabs = {};

  if (inspector) {
    // FES shape: inspector = { CONTENT: [keys], STYLE: [keys], ... }
    for (const [groupName, keys] of Object.entries(inspector)) {
      const fields = (keys || []).map(key => {
        const f = fieldSchema[key] || {};
        const field = {
          id: key, path: key, key, label: f.label || nameToLabel(key),
          type: mapFesTypeToControlType(f), hint: f.help || '',
          default: f.default,
        };
        if (f.options) field.options = f.options;
        if (f.min != null) field.min = f.min;
        if (f.max != null) field.max = f.max;
        if (f.step != null) field.step = f.step;
        if (f.placeholder) field.placeholder = f.placeholder;
        return field;
      });
      if (fields.length === 0) continue;
      sections.push({
        id: groupName.toLowerCase(),
        name: groupName,
        data: {}, // values resolved at render time via adapter
        fields,
      });
      const tab = tabForGroup(groupName);
      if (!inspectorTabs[tab]) inspectorTabs[tab] = { groups: [] };
      inspectorTabs[tab].groups.push({ id: groupName.toLowerCase(), name: groupName, fields });
    }
  } else if (moduleDef && moduleDef.schema) {
    // Fallback: flat moduleDef schema
    const fields = Object.entries(moduleDef.schema).map(([key, f]) => ({
      id: key, path: key, key, label: f.label || nameToLabel(key),
      type: mapFesTypeToControlType(f), options: f.options, default: f.default,
    }));
    sections.push({ id: 'settings', name: 'Settings', data: {}, fields });
    inspectorTabs.settings = { groups: [{ id: 'settings', name: 'Settings', fields }] };
  }

  return {
    structure: { sections },
    inspector: inspectorTabs,
    moduleType: (fesSpec && fesSpec.moduleType) || (moduleDef && moduleDef.id),
    label: (fesSpec && fesSpec.label) || (moduleDef && moduleDef.label),
  };
}

let _shellEnsured = null;
async function ensureShell() {
  if (_shellEnsured) return _shellEnsured;
  _shellEnsured = (async () => {
    // Check if shell already in DOM
    if (document.getElementById('fes-v2-shell-root')) {
      return document.getElementById('fes-v2-shell-root');
    }
    const html = await (await fetch(SHELL_URL)).text();
    const wrap = document.createElement('div');
    wrap.id = 'fes-v2-shell-root';
    // Extract <style> tags and <script> separately
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Move <style> tags to head
    doc.querySelectorAll('style').forEach(s => {
      const clone = document.createElement('style');
      for (const a of s.attributes) clone.setAttribute(a.name, a.value);
      clone.textContent = s.textContent;
      if (!document.getElementById(s.id || '')) document.head.appendChild(clone);
    });
    // Move root HTML element (everything not script/style) to body
    const root = doc.querySelector('[data-fvcms-v2-root]') || doc.body.firstElementChild;
    if (root) {
      // Re-create the root in our document so scripts can be properly attached
      const newRoot = document.createElement('div');
      newRoot.id = root.id || 'fes-v2-drawer';
      newRoot.className = root.className;
      newRoot.innerHTML = root.innerHTML;
      document.body.appendChild(newRoot);
    }
    // Execute the <script> from shell.html — must be done as a real script
    const scriptEl = doc.querySelector('script');
    if (scriptEl) {
      const s = document.createElement('script');
      s.textContent = scriptEl.textContent;
      document.head.appendChild(s);
      // Remove the script from head after execution
      setTimeout(() => s.remove(), 0);
    }

    // Build FES_V2_CONTROLS map and preload all 24 controls
    const controlNames = [
      'dropdown', 'text', 'number', 'slider', 'color', 'switch',
      'dimension', 'radius', 'tags', 'responsive', 'pills',
      'motion-grid', 'bg-tabs', 'textarea',
      'background-color', 'background-gradient', 'background-image', 'background-unsplash',
      'shadow-multi', 'filters', 'backdrop-filter',
      'motion-entrance', 'motion-trigger', 'ai-assist',
    ];
    window.FES_V2_CONTROLS = {};
    if (!window.FES_CONTROLS_V2) window.FES_CONTROLS_V2 = { _modules: new Map() };

    for (const name of controlNames) {
      const path = new URL(`./controls/${name}/${name}.js`, import.meta.url).href;
      window.FES_V2_CONTROLS[name] = path;
      try {
        const mod = await import(path);
        window.FES_CONTROLS_V2._modules.set(name, mod);
      } catch (e) {
        console.warn(`[v2-inspector] preload failed for ${name}:`, e.message);
      }
    }

    // Wire FES_CONTROLS_V2.render
    window.FES_CONTROLS_V2.render = function(type, field, value, onChange, adapter) {
      const mod = window.FES_CONTROLS_V2._modules.get(type);
      if (!mod || !mod.render) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value || '';
        input.addEventListener('change', e => onChange && onChange(e.target.value));
        return input;
      }
      const compatField = Object.assign({}, field, {
        props: Object.assign({}, field, {
          placeholder: field.placeholder || field.label,
          maxLength: field.maxLength || (field.type === 'text' ? 200 : undefined),
        }),
      });
      return mod.render(compatField, value, onChange, adapter);
    };

    // Load CSS
    for (const [name, path] of Object.entries(window.FES_V2_CONTROLS)) {
      const cssUrl = path.replace(/\.js$/, '.css');
      if (!document.querySelector(`link[href="${cssUrl}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        document.head.appendChild(link);
      }
    }
    return root || wrap;
  })();
  return _shellEnsured;
}

/**
 * v2Inspect — render the world-class form for a module instance.
 * Returns the root HTMLElement. Caller mounts it in a panel.
 */
export async function v2Inspect({ moduleInstance, moduleDef, onSave, store }) {
  const s = store || getStore();
  await ensureShell();

  const widgetType = (moduleDef && moduleDef.id ? moduleDef.id.replace(/^M-/, '') : null)
                  || moduleInstance.moduleType
                  || moduleInstance.widgetType;
  const typeKey = typeKeyFromWidgetType(widgetType);
  const fesSpec = await loadFesSpec(typeKey);
  const spec = adaptSpecForV2(fesSpec, moduleDef);

  // Adapter: read through sourceAdapter or config, write through config + store
  const sourceAdapter = fesSpec && fesSpec.sourceAdapter;
  const adapter = {
    readValue: (path) => {
      // Try sourceAdapter read
      if (sourceAdapter && sourceAdapter.fields && sourceAdapter.fields[path] && moduleInstance.el) {
        const expr = sourceAdapter.fields[path].read;
        try {
          return new Function('el', `with(el) { return (${expr}); }`)(moduleInstance.el);
        } catch (e) { /* fall through */ }
      }
      return deepGet(moduleInstance.config || {}, path);
    },
    writeValue: (path, value) => {
      if (!moduleInstance.config) moduleInstance.config = {};
      deepSet(moduleInstance.config, path, value);
    },
  };

  const handleChange = async (path, value) => {
    adapter.writeValue(path, value);
    if (s) {
      try { await s.putModule({ ...moduleInstance, config: moduleInstance.config }); }
      catch (e) { console.warn('[v2-inspector] putModule failed', e); }
    }
    if (onSave) onSave(moduleInstance.config);
  };

  const openFn = window.FES_SHELL_V2 && window.FES_SHELL_V2.open;
  if (typeof openFn !== 'function') {
    console.warn('[v2-inspector] FES_SHELL_V2.open not available, using fallback');
    return renderBasicFallback(spec, moduleInstance, onSave, s);
  }

  // Call as a method on FES_SHELL_V2 so `this` is bound correctly
  openFn.call(window.FES_SHELL_V2, moduleInstance.el || document.body, spec, adapter, {
    onSave: (config) => onSave && onSave(config),
    onChange: handleChange,
    autoSelectFirst: true,
  });

  return document.getElementById('fes-v2-shell-root');
}

function renderBasicFallback(spec, moduleInstance, onSave, store) {
  const root = document.createElement('div');
  root.style.cssText = 'padding:16px;color:#e6e9ef;background:#0b0d11;min-height:300px;';
  const head = document.createElement('div');
  head.textContent = (spec.label || 'Editor') + ' (fallback)';
  head.style.cssText = 'font-weight:700;margin-bottom:12px;';
  root.appendChild(head);
  for (const section of (spec.structure && spec.structure.sections) || []) {
    const h = document.createElement('div');
    h.textContent = section.name;
    h.style.cssText = 'font-size:11px;font-weight:600;color:#888;margin:8px 0 4px;text-transform:uppercase;';
    root.appendChild(h);
    for (const f of section.fields) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;padding:4px 0;';
      const lbl = document.createElement('label');
      lbl.textContent = f.label;
      lbl.style.cssText = 'flex:0 0 120px;font-size:12px;color:#aaa;';
      const input = document.createElement('input');
      input.value = deepGet(moduleInstance.config, f.path) || '';
      input.style.cssText = 'flex:1;background:#1a1f27;border:1px solid #2a3038;color:#e6e9ef;padding:4px 8px;border-radius:4px;';
      input.addEventListener('change', e => {
        deepSet(moduleInstance.config, f.path, e.target.value);
        if (store) store.putModule({ ...moduleInstance });
        if (onSave) onSave(moduleInstance.config);
      });
      row.appendChild(lbl);
      row.appendChild(input);
      root.appendChild(row);
    }
  }
  return root;
}

export const __v2 = { v2Inspect, adaptSpecForV2, ensureShell };
