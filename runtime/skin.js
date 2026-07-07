// runtime/skin.js — skin system
// A skin is a bundle of module-default overrides + CSS tokens.
// Applied at runtime to the live DOM.

import { getStore } from './store.js';
import { renderAll } from './renderer.js';

let _skinCSSEl = null;

/**
 * Apply a skin to the live page + store.
 * 1. Sets the CSS custom properties (--tokens) on :root
 * 2. Updates module configs that don't override the relevant fields
 * 3. Triggers a re-render of all modules
 */
export function applySkin(skinId) {
  const store = getStore();
  const skin = store.getSkin(skinId);
  if (!skin) {
    console.warn('[fvcms] skin not found:', skinId);
    return;
  }
  store.setActiveSkin(skinId);

  // 1. Inject CSS tokens
  if (!_skinCSSEl) {
    _skinCSSEl = document.createElement('style');
    _skinCSSEl.id = 'fvcms-skin-tokens';
    document.head.appendChild(_skinCSSEl);
  }
  const cssVars = Object.entries(skin.cssTokens || {})
    .map(([k, v]) => `${k}: ${v};`)
    .join('\n');
  _skinCSSEl.textContent = `:root {\n${cssVars}\n}`;

  // 2. Apply module defaults — only where the module doesn't have an
  // explicit per-instance value. This respects operator overrides.
  for (const moduleId in store.modules) {
    const m = store.modules[moduleId];
    const overrides = skin.moduleDefaults[moduleId];
    if (!overrides) continue;
    const newConfig = { ...overrides, ...m.config }; // instance wins
    m.config = newConfig;
  }

  // 3. Re-render everything
  renderAll();
}

/**
 * Register a skin in the store (call once on app boot).
 */
export function registerSkin(skin) {
  getStore().putSkin(skin);
}

/**
 * Return a list of skins the operator can choose from.
 */
export function listSkins() {
  return getStore().listSkins();
}

/**
 * Render a skin-picker UI as a returned HTMLElement. Caller mounts it
 * into a panel. Includes a "default" option that means no skin.
 */
export function renderSkinPicker({ onChange } = {}) {
  const root = document.createElement('div');
  root.className = 'fvcms-skin-picker';
  const label = document.createElement('div');
  label.className = 'fvcms-skin-picker-label';
  label.textContent = 'Skin:';
  root.appendChild(label);
  const select = document.createElement('select');
  select.className = 'fvcms-skin-select';

  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = '— No skin —';
  select.appendChild(noneOpt);

  for (const skin of listSkins()) {
    const opt = document.createElement('option');
    opt.value = skin.id;
    opt.textContent = skin.label;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => {
    if (select.value) applySkin(select.value);
    else {
      getStore().setActiveSkin(null);
      renderAll();
    }
    if (onChange) onChange(select.value);
  });
  root.appendChild(select);
  return root;
}