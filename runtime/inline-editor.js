// runtime/inline-editor.js — inline text editor
// Click on text in a module → edit → blur/Enter → write back through
// scope system (field-level).

import { getStore } from './store.js';
import { assertOp } from './scope.js';

/**
 * Make a DOM element editable for one of its text fields.
 * On commit, writes back to the module instance via the scope system.
 *
 * @param {Object} opts
 * @param {HTMLElement} opts.el           - the DOM element to make editable
 * @param {string} opts.moduleInstanceId  - which module instance owns this text
 * @param {string} opts.fieldName         - which field on the module
 */
export function makeInlineEditable({ el, moduleInstanceId, fieldName }) {
  if (el.dataset.fvcmsEditable === '1') return;
  el.dataset.fvcmsEditable = '1';
  el.style.cursor = 'text';
  el.style.outline = '1px dashed rgba(180, 140, 80, 0)';
  el.style.transition = 'outline 0.15s ease';

  let originalValue = el.textContent;

  const startEdit = () => {
    el.contentEditable = 'true';
    el.focus();
    document.execCommand('selectAll', false, null);
    el.style.outline = '2px solid rgba(180, 140, 80, 0.9)';
    el.style.outlineOffset = '2px';
  };

  const commit = () => {
    el.contentEditable = 'false';
    el.style.outline = '';
    const newValue = el.textContent;
    if (newValue === originalValue) return;
    originalValue = newValue;

    try {
      assertOp({ type: 'field', moduleInstanceId, field: fieldName }, 'editContent');
      const store = getStore();
      store.updateField(moduleInstanceId, fieldName, newValue);
      showSavedToast(`Saved · ${moduleInstanceId}.${fieldName}`);
    } catch (e) {
      console.error('[fvcms] inline edit blocked:', e.message);
      el.textContent = originalValue;
      showSavedToast('Edit blocked: ' + e.message, true);
    }
  };

  const cancel = () => {
    el.contentEditable = 'false';
    el.style.outline = '';
    el.textContent = originalValue;
  };

  el.addEventListener('click', e => {
    e.stopPropagation();
    if (el.contentEditable !== 'true') startEdit();
  });

  el.addEventListener('blur', commit);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
}

function showSavedToast(msg, isError = false) {
  let toast = document.getElementById('fvcms-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'fvcms-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 60px; right: 12px; z-index: 2147483647;
    background: ${isError ? '#a04040' : '#2d4f2d'}; color: #fff;
    padding: 8px 14px; border-radius: 6px; font: 12px ui-monospace, monospace;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    opacity: 0; transition: opacity 0.2s ease;
  `;
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => { toast.style.opacity = '0'; }, 2200);
}