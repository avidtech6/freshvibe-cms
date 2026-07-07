// runtime/visualizer.js — annotation visualiser
// When the operator opens the dev panel, draw overlays on the live page
// marking each region's boundary. Hovering shows the label.
// Clicking the overlay opens the region navigator entry.

import { getStore } from './store.js';

let _overlayRoot = null;
let _active = false;

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
    overlay.style.cssText = `
      position: absolute; pointer-events: auto;
      border: 1.5px dashed rgba(180, 140, 80, 0.7);
      background: rgba(180, 140, 80, 0.05);
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.0);
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    `;
    const rect = target.getBoundingClientRect();
    overlay.style.top = (rect.top + window.scrollY) + 'px';
    overlay.style.left = (rect.left + window.scrollX) + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';

    const label = document.createElement('div');
    label.textContent = region.label || region.id;
    label.style.cssText = `
      position: absolute; top: -22px; left: -1px;
      background: rgba(180, 140, 80, 0.95); color: #1a1a1a;
      padding: 2px 8px; font: 11px ui-monospace, monospace;
      font-weight: 700; letter-spacing: 0.4px;
      border-radius: 3px 3px 0 0;
      pointer-events: none;
    `;
    overlay.appendChild(label);

    const badgeCount = store.listGroupsForRegion(regionId).length;
    const badge = document.createElement('div');
    badge.textContent = `${badgeCount} groups`;
    badge.style.cssText = `
      position: absolute; top: -22px; right: -1px;
      background: rgba(40, 40, 40, 0.85); color: #fff;
      padding: 2px 8px; font: 10px ui-monospace, monospace;
      border-radius: 3px 3px 0 0;
      pointer-events: none;
    `;
    overlay.appendChild(badge);

    overlay.addEventListener('mouseenter', () => {
      overlay.style.background = 'rgba(180, 140, 80, 0.15)';
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

    _overlayRoot.appendChild(overlay);
  }
}

export function hideRegionOverlays() {
  _active = false;
  if (_overlayRoot) _overlayRoot.innerHTML = '';
}

export function isOverlaysActive() {
  return _active;
}

// Re-position overlays on scroll/resize (best-effort)
let _scrollTimer = null;
export function startOverlayTracking() {
  window.addEventListener('scroll', () => {
    clearTimeout(_scrollTimer);
    _scrollTimer = setTimeout(() => {
      if (_active) showRegionOverlays();
    }, 100);
  }, true);
  window.addEventListener('resize', () => {
    clearTimeout(_scrollTimer);
    _scrollTimer = setTimeout(() => {
      if (_active) showRegionOverlays();
    }, 100);
  });
}