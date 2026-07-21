// FES v2 Integration Patch — appended to the live dispatcher
// Converts FES spec format to v2 shell's expected format and delegates
// when window.FES_V2_INSPECTOR.enabled is true.

(function() {
  function whenV2Ready() {
    return new Promise((resolve) => {
      if (window.FES_V2_LOADER && window.FES_V2_LOADER.ready && window.FES_SHELL_V2) {
        return resolve(true);
      }
      const t = setTimeout(() => resolve(false), 3000);
      window.addEventListener('fes-v2-ready', () => {
        clearTimeout(t);
        resolve(true);
      }, { once: true });
    });
  }

  // FES spec format:  { fieldSchema: { key: { type, label, options, ... } }, inspector: { Settings: [keyNames], Style: [...], Advanced: [...] } }
  // Shell expects:     { inspector: { settings/style/advanced: { groups: [{ name, fields: [{ path, label, type, default }] }] } } }
  // We translate the FES shape to the shell's expected shape.
  const GROUP_MAP = {
    html_tag: 'Layout', content_width: 'Layout', gap: 'Layout',
    display: 'Layout', direction: 'Layout', align: 'Layout', alignment: 'Layout',
    flex_: 'Layout', grid_: 'Layout',
    padding: 'Spacing', margin: 'Spacing',
    background: 'Background', bg_: 'Background', overlay: 'Background',
    BACKGROUND: 'Background',
    font: 'Typography', font_: 'Typography', text_: 'Typography', heading: 'Typography',
    TYPOGRAPHY: 'Typography',
    color: 'Color', colors: 'Color',
    border: 'Border', border_: 'Border', border_radius: 'Border',
    shadow: 'Effects', box_shadow: 'Effects', filter: 'Effects', blur: 'Effects',
    motion: 'Motion', animation: 'Motion', transition: 'Motion',
    custom_id: 'CSS & IDs', css_: 'CSS & IDs', css_classes: 'CSS & IDs', class: 'CSS & IDs', custom_css: 'CSS & IDs',
    responsive: 'Responsive', hide_: 'Responsive', visible: 'Responsive', desktop_visible: 'Responsive', tablet_visible: 'Responsive', mobile_visible: 'Responsive'
  };

  function groupFieldKeys(fieldKeys, mod) {
    const fieldSchema = mod.fieldSchema || {};
    const groups = {};
    for (const key of fieldKeys) {
      const schema = fieldSchema[key] || {};
      // Don't skip uppercase - they may be WCP composites but the user still wants to edit them
      // The shell will handle WCP composition via control type lookup
      // Determine group
      let group = 'Other';
      for (const [prefix, gname] of Object.entries(GROUP_MAP)) {
        if (key === prefix || key.startsWith(prefix + '_') || key.startsWith(prefix)) { group = gname; break; }
      }
      if (!groups[group]) groups[group] = [];
      groups[group].push({
        path: key,
        id: key,
        label: schema.label || key,
        type: schema.type || 'text',
        options: schema.options,
        default: schema.default
      });
    }
    return Object.entries(groups).map(([name, fields]) => ({ name, fields }));
  }

  function adaptSpecForV2(mod, typeKey) {
    const inspector = mod.inspector || {};
    return {
      structure: {
        sections: [{
          id: typeKey,
          name: mod.label || mod.moduleType || typeKey,
          label: mod.label || mod.moduleType || typeKey,
          tag: typeKey,
          modified: false,
          data: {}
        }]
      },
      inspector: {
        settings: { groups: groupFieldKeys(inspector.Settings || [], mod) },
        style:    { groups: groupFieldKeys(inspector.Style || [], mod) },
        advanced: { groups: groupFieldKeys(inspector.Advanced || [], mod) }
      },
      fieldSchema: mod.fieldSchema || {},
      moduleType: mod.moduleType,
      label: mod.label
    };
  }

  function makeAdapter(read, write) {
    return {
      readValue: (path) => {
        const s = read();
        return s ? s[path] : undefined;
      },
      write: async (newSettings) => write(newSettings),
      read: async () => read(),
      generateId: () => 'fes-' + Math.random().toString(36).slice(2, 8)
    };
  }

  window.FES_V2_INSPECTOR = {
    enabled: false,
    async openInspectorV2(widgetEl, badgeTag, widgetId, widgetType, mod, readSettings, writeSettings) {
      const ok = await whenV2Ready();
      if (!ok) return false;
      const fesSpec = adaptSpecForV2(mod, widgetType);
      const adapter = makeAdapter(readSettings, writeSettings);
      window.FES_SHELL_V2.open(widgetEl, fesSpec, adapter, {
        device: 'desktop',
        onApply: (newSettings) => writeSettings(newSettings),
        onRevert: () => readSettings(),
        onClose: () => {}
      });
      return true;
    },
    async openSectionInspectorV2(sectionEl, badgeTag, sectionIndex, mod, readSettings, writeSettings) {
      const ok = await whenV2Ready();
      if (!ok) return false;
      const fesSpec = adaptSpecForV2(mod, 'section.default');
      const adapter = makeAdapter(readSettings, writeSettings);
      window.FES_SHELL_V2.open(sectionEl, fesSpec, adapter, {
        device: 'desktop',
        onApply: (newSettings) => writeSettings(newSettings),
        onRevert: () => readSettings(),
        onClose: () => {}
      });
      return true;
    }
  };

  console.log('[FES v2 patch] Ready (set window.FES_V2_INSPECTOR.enabled = true to use)');
})();
