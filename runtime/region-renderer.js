// runtime/region-renderer.js — applies Region.config to the live DOM
// Patches the region's background, padding, max-width, text colour as
// inline styles. Subscribes to store changes so edits re-render live.

import { getStore } from './store.js';

const MAX_WIDTH_PRESETS = {
  narrow: '720px',
  normal: '1180px',
  wide: '1440px',
  full: '100%',
};

let _subscribed = false;

export function renderRegion(regionId) {
  const store = getStore();
  const region = store.getRegion(regionId);
  if (!region) return;
  const target = document.querySelector(region.selector);
  if (!target) return;
  const config = region.config || {};
  if (config.background != null) {
    target.style.background = config.background;
  } else {
    target.style.background = '';
  }
  if (config.paddingX != null || config.paddingY != null) {
    const px = config.paddingX || '';
    const py = config.paddingY || '';
    target.style.padding = `${py} ${px}`.trim();
  } else {
    target.style.padding = '';
  }
  if (config.maxWidth) {
    const maxW = MAX_WIDTH_PRESETS[config.maxWidth] || config.maxWidth;
    // We apply max-width to a content wrapper if it exists, else to the region.
    const content = target.querySelector('[data-region-content]') || target;
    content.style.maxWidth = maxW;
    content.style.marginLeft = 'auto';
    content.style.marginRight = 'auto';
  }
  if (config.textColor) {
    target.style.color = config.textColor;
  } else {
    target.style.color = '';
  }
}

export function renderAllRegions() {
  const store = getStore();
  for (const id of Object.keys(store.regions)) {
    renderRegion(id);
  }
}

export function applyRegionToStore(regionId, configPatch) {
  const store = getStore();
  const region = store.getRegion(regionId);
  if (!region) return null;
  region.config = { ...(region.config || {}), ...configPatch };
  store._persist('regions', region);
  renderRegion(regionId);
  return region;
}

export function subscribeRegionRenderer() {
  if (_subscribed) return;
  _subscribed = true;
  const store = getStore();
  const origPutRegion = store.putRegion.bind(store);
  store.putRegion = function (region) {
    origPutRegion(region);
    renderRegion(region.id);
  };
}

// Update field helper for region configs (like updateField for modules).
// We mutate the stored region directly because there's no separate
// field-level granularity.
export function updateRegionConfig(regionId, key, value) {
  const store = getStore();
  const region = store.getRegion(regionId);
  if (!region) return null;
  region.config = { ...(region.config || {}), [key]: value };
  store._persist('regions', region);
  renderRegion(regionId);
  return region;
}