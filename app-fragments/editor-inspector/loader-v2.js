// FES v2 Loader — loads the world-class shell + 14 controls as ES modules
// and exposes them as window.FES_SHELL_V2 + window.FES_CONTROLS_V2
//
// Used by oscar-inspector-dispatcher.js when window.__FES_V2_ENABLED__ is true.
//
// All modules are isolated per FvW v8 §10/§11 (one folder per control, 10 v8 docs each).
// Adding a new control = add it to FES_V2_CONTROLS map + put files in controls/<name>/
// Nothing else changes (no edits to existing controls).
//
// Deploy: /var/www/freshvibeapps/clients/oscar-web/app-fragments/fes-v2/loader.js

const FES_V2_BASE = '/app-fragments/fes-v2';

// Map of control type → ES module path
// Adding a new control = add a line here, deploy a new folder, done.
const FES_V2_CONTROLS = {
  'select':       `${FES_V2_BASE}/controls/dropdown/dropdown.js`,
  'text':         `${FES_V2_BASE}/controls/text/text.js`,
  'number':       `${FES_V2_BASE}/controls/number/number.js`,
  'slider':       `${FES_V2_BASE}/controls/slider/slider.js`,
  'color':        `${FES_V2_BASE}/controls/color/color.js`,
  'switch':       `${FES_V2_BASE}/controls/switch/switch.js`,
  'dimension':    `${FES_V2_BASE}/controls/dimension/dimension.js`,
  'radius':       `${FES_V2_BASE}/controls/radius/radius.js`,
  'tags':         `${FES_V2_BASE}/controls/tags/tags.js`,
  'responsive':   `${FES_V2_BASE}/controls/responsive/responsive.js`,
  'pills':        `${FES_V2_BASE}/controls/pills/pills.js`,
  'motion':       `${FES_V2_BASE}/controls/motion-grid/motion-grid.js`,
  'bg-type':      `${FES_V2_BASE}/controls/bg-tabs/bg-tabs.js`,
  'textarea':     `${FES_V2_BASE}/controls/textarea/textarea.js`,
  'background-color':    `${FES_V2_BASE}/controls/background-color/background-color.js`,
  'background-gradient': `${FES_V2_BASE}/controls/background-gradient/background-gradient.js`,
  'background-image':    `${FES_V2_BASE}/controls/background-image/background-image.js`,
  'background-unsplash': `${FES_V2_BASE}/controls/background-unsplash/background-unsplash.js`,
  'shadow-multi':        `${FES_V2_BASE}/controls/shadow-multi/shadow-multi.js`,
  'filters':             `${FES_V2_BASE}/controls/filters/filters.js`,
  'backdrop-filter':     `${FES_V2_BASE}/controls/backdrop-filter/backdrop-filter.js`,
  'motion-entrance':     `${FES_V2_BASE}/controls/motion-entrance/motion-entrance.js`,
  'motion-trigger':      `${FES_V2_BASE}/controls/motion-trigger/motion-trigger.js`,
  'ai-assist':           `${FES_V2_BASE}/controls/ai-assist/ai-assist.js`,
};

// Cache for loaded modules
const moduleCache = new Map();

async function loadModule(path) {
  if (moduleCache.has(path)) return moduleCache.get(path);
  try {
    const mod = await import(path);
    moduleCache.set(path, mod);
    return mod;
  } catch (e) {
    console.error(`[FES v2] Failed to load ${path}:`, e);
    return null;
  }
}

async function loadCss(path) {
  return new Promise((resolve) => {
    if (document.querySelector(`link[data-fes-v2="${path}"]`)) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = path;
    link.dataset.fesV2 = path;
    link.onload = () => resolve();
    link.onerror = () => { console.warn(`[FES v2] CSS load failed: ${path}`); resolve(); };
    document.head.appendChild(link);
  });
}

// Expose controls factory
window.FES_CONTROLS_V2 = {
  render: function(type, field, value, onChange, adapter) {
    const path = FES_V2_CONTROLS[type];
    if (!path) {
      console.warn(`[FES v2] Unknown control type: ${type}, falling back to text input`);
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value || '';
      input.addEventListener('input', (e) => onChange && onChange(e.target.value));
      return input;
    }
    // Get from cache (preloaded at startup); if not cached, fall back to text input
    const mod = moduleCache.get(path);
    if (!mod || !mod.render) {
      // Trigger async load for next time
      loadModule(path);
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value || '';
      input.addEventListener('change', (e) => onChange && onChange(e.target.value));
      return input;
    }
    // Wrap field with .props for backward compat with v1 controls
    // v1 controls expect field.props.{maxLength, pattern, placeholder, etc}
    // v2 controls expect field.{type, path, label, options, ...}
    // The adapter produces v2 shape; we add props as alias for v1 compat
    const compatField = Object.assign({}, field, {
      props: Object.assign({}, field, {
        placeholder: field.placeholder || field.label,
        maxLength: field.maxLength || (field.type === 'text' ? 200 : undefined),
        pattern: field.pattern,
      })
    });
    return mod.render(compatField, value, onChange, adapter || { generateId: () => 'fes-' + Math.random().toString(36).slice(2, 8) });
  },
  // Async preload (call this before using render to ensure all controls are cached)
  preloadAll: async function() {
    const promises = Object.values(FES_V2_CONTROLS).map(p => loadModule(p));
    await Promise.all(promises);
    console.log('[FES v2] All 14 controls preloaded');
  },
  // Expose for testing
  _controls: FES_V2_CONTROLS,
};

// Expose shell
let shellLoaded = false;
async function loadShell() {
  if (shellLoaded) return window.FES_SHELL_V2;
  // Load shell.css + shell.html (for CSS) — actually shell.html has CSS embedded
  // We just need the script. The HTML file IS a self-contained script.
  // We'll inject it via dynamic import — but it's a HTML file, not a module.
  // Workaround: use fetch + extract script.
  try {
    const r = await fetch(`${FES_V2_BASE}/shell/shell.html`);
    const html = await r.text();
    // Extract <style> and inject
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    if (styleMatch) {
      const style = document.createElement('style');
      style.dataset.fesV2 = 'shell';
      style.textContent = styleMatch[1];
      document.head.appendChild(style);
    }
    // Extract <body> contents and inject (so the shell DOM exists)
    // IMPORTANT: stop at <script> to avoid capturing the script as DOM
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)(?=<script|$)/);
    if (bodyMatch) {
      const div = document.createElement('div');
      div.id = 'fes-shell-host';
      div.innerHTML = bodyMatch[1].replace('</body>', '').trim();
      document.body.appendChild(div);
    }
    // Extract <script> and inject
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      const script = document.createElement('script');
      script.dataset.fesV2 = 'shell';
      script.textContent = scriptMatch[1];
      document.head.appendChild(script);
    }
    shellLoaded = true;
    return window.FES_SHELL_V2;
  } catch (e) {
    console.error('[FES v2] Failed to load shell:', e);
    return null;
  }
}

window.FES_V2_LOADER = {
  loadShell,
  loadModule,
  ready: false,
};

// Auto-load on script load
(async () => {
  await loadShell();
  // Preload all controls so FES_CONTROLS_V2.render() is sync
  if (window.FES_CONTROLS_V2 && window.FES_CONTROLS_V2.preloadAll) {
    await window.FES_CONTROLS_V2.preloadAll();
  }
  // Load CSS for each control
  for (const path of Object.values(FES_V2_CONTROLS)) {
    const cssPath = path.replace(/\.js$/, '.css');
    loadCss(cssPath);
  }
  window.FES_V2_LOADER.ready = true;
  // Fire an event so the dispatcher knows
  window.dispatchEvent(new CustomEvent('fes-v2-ready'));
  console.log('[FES v2] Shell + controls ready');
})();
