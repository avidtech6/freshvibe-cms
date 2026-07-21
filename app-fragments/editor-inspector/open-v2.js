// open-v2.js — namespace bridge for the existing dispatcher.
// Defines window.FES_V2_INSPECTOR = { enabled, openInspectorV2, openSectionInspectorV2 }
// so the canonical oscar-fes-inspector-dispatcher.js can opt-in via URL param.

import { v2Inspect } from './v2-inspector.js';

const FES_V2_INSPECTOR = {
  enabled: true,  // ON by default; old behavior only when explicitly disabled

  async openInspectorV2(widgetEl, badgeTag, widgetId, widgetType, mod, readSettings, writeSettings) {
    try {
      // Build a moduleInstance-shaped object the v2-inspector expects
      const moduleInstance = {
        id: widgetId || 'w-' + Date.now(),
        moduleType: widgetType,
        widgetType,
        el: widgetEl,
        config: readSettings ? readSettings() : {},
      };
      const moduleDef = {
        id: 'M-' + (widgetType || 'unknown').replace(/\./g, '-'),
        label: mod.label || mod.moduleType || widgetType,
        schema: mod.fieldSchema || {},
      };
      const root = await v2Inspect({
        moduleInstance,
        moduleDef,
        onSave: (config) => writeSettings && writeSettings(config),
      });
      // Hook live updates: re-read on every change
      if (root) {
        const observer = new MutationObserver(() => {
          // Re-read live settings (e.g. after onChange)
          if (writeSettings && moduleInstance.config) {
            writeSettings(moduleInstance.config);
          }
        });
        observer.observe(root, { childList: true, subtree: true });
      }
      return true;
    } catch (e) {
      console.error('[open-v2] openInspectorV2 failed:', e);
      return false;
    }
  },

  async openSectionInspectorV2(sectionEl, badgeTag, sectionIndex, mod, readSettings, writeSettings) {
    try {
      const moduleInstance = {
        id: 's-' + (sectionIndex || 0),
        moduleType: 'section',
        widgetType: 'section.default',
        el: sectionEl,
        config: readSettings ? readSettings() : {},
      };
      const moduleDef = {
        id: 'M-section',
        label: 'Section',
        schema: mod.fieldSchema || {},
      };
      const root = await v2Inspect({
        moduleInstance,
        moduleDef,
        onSave: (config) => writeSettings && writeSettings(config),
      });
      if (root) {
        const observer = new MutationObserver(() => {
          if (writeSettings && moduleInstance.config) writeSettings(moduleInstance.config);
        });
        observer.observe(root, { childList: true, subtree: true });
      }
      return true;
    } catch (e) {
      console.error('[open-v2] openSectionInspectorV2 failed:', e);
      return false;
    }
  }
};

if (typeof window !== 'undefined') {
  // Allow ?fes-v2=0 in URL to disable (back-compat with old behavior)
  if (new URLSearchParams(location.search).get('fes-v2') === '0') {
    FES_V2_INSPECTOR.enabled = false;
  }
  window.FES_V2_INSPECTOR = FES_V2_INSPECTOR;
  console.log('[FES v2] ready, enabled=' + FES_V2_INSPECTOR.enabled);
}
