// runtime/region-editor.js — UI for editing Region.config
// Renders a form with background, padding, max-width, text colour fields.

import { getStore } from './store.js';
import { updateRegionConfig, renderRegion } from './region-renderer.js';

export function renderRegionEditor() {
  const root = document.createElement('div');
  root.className = 'fvcms-region-editor';

  const store = getStore();
  const page = store.getPage(store.activeContext.page);
  if (!page) {
    root.textContent = '(no active page)';
    return root;
  }

  for (const regionId of page.regionIds) {
    const region = store.getRegion(regionId);
    if (!region) continue;

    const section = document.createElement('div');
    section.className = 'fvcms-region-editor-section';

    const head = document.createElement('div');
    head.className = 'fvcms-region-editor-head';
    head.textContent = region.label || region.id;
    section.appendChild(head);

    const cfg = region.config || {};

    // background — color + gradient presets
    const bgWrap = document.createElement('div');
    bgWrap.className = 'fvcms-region-field';
    const bgLabel = document.createElement('label');
    bgLabel.textContent = 'Background';
    bgWrap.appendChild(bgLabel);
    const bgRow = document.createElement('div');
    bgRow.style.cssText = 'display: flex; gap: 4px;';
    const bgPresets = [
      { label: 'transparent', value: 'transparent' },
      { label: 'white',       value: '#ffffff' },
      { label: 'soft green',  value: '#e8f0e0' },
      { label: 'cream',       value: '#f4f4ec' },
      { label: 'forest',      value: 'linear-gradient(135deg, #1a3324, #2d4f2d)' },
      { label: 'sunset',      value: 'linear-gradient(135deg, #f6c89f, #f4a261)' },
      { label: 'sky',         value: 'linear-gradient(135deg, #b5e0ff, #5dade2)' },
    ];
    bgPresets.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fvcms-bg-preset';
      btn.textContent = p.label;
      btn.dataset.value = p.value;
      btn.style.cssText = 'flex: 1; font-size: 9px; padding: 3px 4px; border-radius: 3px; border: 1px solid rgba(120,160,120,0.3); background: rgba(60,100,60,0.3); color: #d0e0d0; cursor: pointer;';
      if (cfg.background === p.value) btn.style.background = 'rgba(180, 140, 80, 0.7)';
      btn.addEventListener('click', () => {
        updateRegionConfig(region.id, 'background', p.value);
        // Update button highlight
        bgRow.querySelectorAll('button').forEach(b => b.style.background = 'rgba(60,100,60,0.3)');
        btn.style.background = 'rgba(180, 140, 80, 0.7)';
      });
      bgRow.appendChild(btn);
    });
    bgWrap.appendChild(bgRow);

    const bgInput = document.createElement('input');
    bgInput.type = 'text';
    bgInput.placeholder = 'Custom CSS background...';
    bgInput.value = cfg.background || '';
    bgInput.style.cssText = 'margin-top: 4px; width: 100%; font-size: 10px; background: rgba(0,0,0,0.3); color: #e8e8e0; border: 1px solid rgba(120,160,120,0.3); border-radius: 3px; padding: 3px 5px; box-sizing: border-box;';
    bgInput.addEventListener('input', () => {
      updateRegionConfig(region.id, 'background', bgInput.value || 'transparent');
    });
    bgWrap.appendChild(bgInput);
    section.appendChild(bgWrap);

    // padding
    const padWrap = document.createElement('div');
    padWrap.className = 'fvcms-region-field';
    padWrap.style.cssText = 'margin-top: 8px;';
    const padLabel = document.createElement('label');
    padLabel.textContent = 'Padding (X / Y)';
    padWrap.appendChild(padLabel);
    const padRow = document.createElement('div');
    padRow.style.cssText = 'display: flex; gap: 4px; align-items: center;';
    const pxInput = document.createElement('input');
    pxInput.type = 'text';
    pxInput.value = cfg.paddingX || '';
    pxInput.placeholder = 'X (e.g. 64px)';
    pxInput.style.cssText = 'flex: 1; font-size: 10px; background: rgba(0,0,0,0.3); color: #e8e8e0; border: 1px solid rgba(120,160,120,0.3); border-radius: 3px; padding: 3px 5px;';
    pxInput.addEventListener('input', () => updateRegionConfig(region.id, 'paddingX', pxInput.value));
    padRow.appendChild(pxInput);
    const pyInput = document.createElement('input');
    pyInput.type = 'text';
    pyInput.value = cfg.paddingY || '';
    pyInput.placeholder = 'Y (e.g. 80px)';
    pyInput.style.cssText = 'flex: 1; font-size: 10px; background: rgba(0,0,0,0.3); color: #e8e8e0; border: 1px solid rgba(120,160,120,0.3); border-radius: 3px; padding: 3px 5px;';
    pyInput.addEventListener('input', () => updateRegionConfig(region.id, 'paddingY', pyInput.value));
    padRow.appendChild(pyInput);
    padWrap.appendChild(padRow);
    section.appendChild(padWrap);

    // max-width preset
    const mwWrap = document.createElement('div');
    mwWrap.className = 'fvcms-region-field';
    mwWrap.style.cssText = 'margin-top: 8px;';
    const mwLabel = document.createElement('label');
    mwLabel.textContent = 'Content max-width';
    mwWrap.appendChild(mwLabel);
    const mwSelect = document.createElement('select');
    mwSelect.style.cssText = 'width: 100%; font-size: 10px; background: rgba(0,0,0,0.3); color: #e8e8e0; border: 1px solid rgba(120,160,120,0.3); border-radius: 3px; padding: 3px 5px;';
    [['narrow', 'Narrow (720px)'], ['normal', 'Normal (1180px)'], ['wide', 'Wide (1440px)'], ['full', 'Full bleed (100%)']].forEach(([v, l]) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = l;
      if (cfg.maxWidth === v) o.selected = true;
      mwSelect.appendChild(o);
    });
    mwSelect.addEventListener('change', () => updateRegionConfig(region.id, 'maxWidth', mwSelect.value));
    mwWrap.appendChild(mwSelect);
    section.appendChild(mwWrap);

    // text colour
    const tcWrap = document.createElement('div');
    tcWrap.className = 'fvcms-region-field';
    tcWrap.style.cssText = 'margin-top: 8px;';
    const tcLabel = document.createElement('label');
    tcLabel.textContent = 'Text colour';
    tcWrap.appendChild(tcLabel);
    const tcRow = document.createElement('div');
    tcRow.style.cssText = 'display: flex; gap: 4px; align-items: center;';
    const tcColor = document.createElement('input');
    tcColor.type = 'color';
    tcColor.value = (cfg.textColor && /^#[0-9a-f]{6}$/i.test(cfg.textColor)) ? cfg.textColor : '#2a2a2a';
    tcColor.style.cssText = 'width: 32px; height: 24px; cursor: pointer; background: transparent; border: 1px solid rgba(120,160,120,0.3); border-radius: 3px;';
    tcColor.addEventListener('input', () => updateRegionConfig(region.id, 'textColor', tcColor.value));
    tcRow.appendChild(tcColor);
    const tcText = document.createElement('input');
    tcText.type = 'text';
    tcText.value = cfg.textColor || '';
    tcText.placeholder = 'inherit / #hex';
    tcText.style.cssText = 'flex: 1; font-size: 10px; background: rgba(0,0,0,0.3); color: #e8e8e0; border: 1px solid rgba(120,160,120,0.3); border-radius: 3px; padding: 3px 5px;';
    tcText.addEventListener('input', () => updateRegionConfig(region.id, 'textColor', tcText.value));
    tcRow.appendChild(tcText);
    tcWrap.appendChild(tcRow);
    section.appendChild(tcWrap);

    // Revert button
    const revertBtn = document.createElement('button');
    revertBtn.type = 'button';
    revertBtn.textContent = 'Revert this region';
    revertBtn.style.cssText = 'margin-top: 8px; width: 100%; font-size: 10px; background: rgba(60, 100, 60, 0.3); color: #d0e0d0; border: 1px solid rgba(120,160,120,0.3); border-radius: 3px; padding: 4px; cursor: pointer;';
    revertBtn.addEventListener('click', () => {
      region.config = {};
      store._persist('regions', region);
      renderRegion(region.id);
      // Re-render the editor itself to refresh fields
      const parent = section.parentNode;
      const newEditor = renderRegionEditor();
      parent.replaceChild(newEditor, root);
      root.parentNode.replaceChild(newEditor, root);
    });
    section.appendChild(revertBtn);

    root.appendChild(section);
  }

  return root;
}