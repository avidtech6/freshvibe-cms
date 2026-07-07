// runtime/visualizer.js — region visualisation
// Dashed overlays that follow the region's live position. Reposition
// every frame via requestAnimationFrame while overlays are active, so
// they stay glued to the region as the page scrolls.

import { getStore } from './store.js';

let _overlayRoot = null;
let _active = false;
let _rafHandle = null;

export function showRegionOverlays() {
  if (_active) return;
  _active = true;

  const store = getStore();
  const page = store.getPage(store.activeContext.page);
  if (!page) return;

  if (!_overlayRoot) {
    _overlayRoot = document.createElement('div');
    _overlayRoot.id = 'fvcms-overlays';
    _overlayRoot.style.cssText = `
      position: fixed; inset: 0; pointer-events: none;
      z-index: 2147483600;
    `;
    document.body.appendChild(_overlayRoot);
  }
  _overlayRoot.innerHTML = '';

  for (const regionId of page.regionIds) {
    const region = store.getRegion(regionId);
    if (!region) continue;
    const target = document.querySelector(region.selector);
    if (!target) continue;

    const overlay = document.createElement('div');
    overlay.className = 'fvcms-region-overlay';
    overlay.dataset.regionId = region.id;
    overlay.style.cssText = `
      position: fixed; pointer-events: auto;
      border: 1.5px dashed rgba(180, 140, 80, 0.7);
      background: rgba(180, 140, 80, 0.05);
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
      z-index: 1;
    `;
    _overlayRoot.appendChild(overlay);

    const label = document.createElement('div');
    label.className = 'fvcms-region-overlay-label';
    label.textContent = region.label || region.id;
    overlay.appendChild(label);

    const badgeCount = store.listGroupsForRegion(regionId).length;
    const badge = document.createElement('div');
    badge.className = 'fvcms-region-overlay-badge';
    badge.textContent = `${badgeCount} groups`;
    overlay.appendChild(badge);

    overlay.addEventListener('mouseenter', () => {
      overlay.style.background = 'rgba(180, 140, 80, 0.18)';
      overlay.style.borderColor = 'rgba(255, 220, 100, 1)';
    });
    overlay.addEventListener('mouseleave', () => {
      overlay.style.background = 'rgba(180, 140, 80, 0.05)';
      overlay.style.borderColor = 'rgba(180, 140, 80, 0.7)';
    });
    overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.__fvcmsHighlightRegion) window.__fvcmsHighlightRegion(region.id);
    });
  }

  // Reposition every frame while active
  const reposition = () => {
    if (!_active) return;
    const overlays = _overlayRoot ? _overlayRoot.querySelectorAll('.fvcms-region-overlay') : [];
    overlays.forEach((overlay) => {
      const regionId = overlay.dataset.regionId;
      const region = store.getRegion(regionId);
      if (!region) return;
      const target = document.querySelector(region.selector);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      overlay.style.top = rect.top + 'px';
      overlay.style.left = rect.left + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
    });
    _rafHandle = requestAnimationFrame(reposition);
  };
  _rafHandle = requestAnimationFrame(reposition);
}

export function hideRegionOverlays() {
  _active = false;
  if (_rafHandle) cancelAnimationFrame(_rafHandle);
  _rafHandle = null;
  if (_overlayRoot) _overlayRoot.innerHTML = '';
}

export function isOverlaysActive() {
  return _active;
}

// Backwards-compat: also listen to scroll/resize for browsers that
// don't fire rAF continuously (rare).
let _scrollTimer = null;
export function startOverlayTracking() {
  window.addEventListener('scroll', () => {
    // rAF loop already handles this; nothing extra needed.
    if (!_active) return;
    clearTimeout(_scrollTimer);
    _scrollTimer = setTimeout(() => {
      // No-op; rAF repaints at 60fps already.
    }, 100);
  }, true);
}