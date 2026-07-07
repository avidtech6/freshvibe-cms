# Adding a new module type

Modules are typed components with a schema, default config, optional
variants, and a renderer. Adding a new one is a 4-step recipe.

## Step 1: Create `modules/<name>.js`

```js
// modules/my-type.js — canonical My Type module
export const myTypeModule = {
  id: 'M-my-type',
  label: 'My Type',
  description: 'What this module does.',
  schema: {
    text: {
      type: 'string',
      label: 'Display text',
      required: true,
      default: '',
    },
    color: {
      type: 'color',
      label: 'Accent colour',
      default: null,
    },
  },
  defaultConfig: {
    text: 'Hello',
    color: null,
  },
  editor: 'editor-form-fields',  // for now, only one editor
};

myTypeModule.variants = [
  { id: 'default', label: 'Default', config: {} },
  { id: 'compact', label: 'Compact', config: { color: '#ccc' } },
];
```

Add the import + entry to `modules/index.js`:

```js
import { myTypeModule } from './my-type.js';

export const CANONICAL_MODULES = [
  // ...existing modules
  myTypeModule,
];
```

## Step 2: Add a renderer in `runtime/renderer.js`

```js
registerRenderer('M-my-type', (m, def, skin) => {
  if (!m.el) return;
  // Read the live DOM from m.selector and patch it
  let target = m.el.querySelector('.fvcms-my-type');
  if (!target) {
    target = document.createElement('div');
    target.className = 'fvcms-my-type';
    m.el.appendChild(target);
  }
  if (m.config.text != null) target.textContent = m.config.text;
  if (m.config.color) target.style.color = m.config.color;
});
```

The render function:
- Receives the module instance (with `.config`), the module def (with
  `.schema`), and the active skin (or null)
- Reads its DOM element from `m.el` (already connected by `connect()`)
- Patches the DOM in place — does NOT re-create from scratch

## Step 3: Add styles in `runtime/styles.css`

```css
.fvcms-my-type {
  padding: 8px;
  border-radius: 6px;
  /* skin-specific overrides using CSS variables */
  background: var(--surface-bg, rgba(0,0,0,0.2));
}
```

Use CSS custom properties (set by skins) where possible so a skin switch
re-styles the module without re-rendering.

## Step 4: Map a detector

If you want this module to be auto-detected from Elementor, add a
case in `detectors/elementor.js`:

```js
case 'eael-my-widget':
  return {
    moduleId: 'M-my-type',
    config: {
      text: s.title || '',
      color: s.color || null,
    },
  };
```

For other stacks, write a detector that produces the same shape.

## Validation checklist

Before merging your new module:

- [ ] `node tests/smoke.mjs` passes
- [ ] Module has 4 field types: at least one `string`, optionally
      others from {number, boolean, color, url, image, select,
      array, object}
- [ ] At least 2 variants (one is fine; zero is okay for very simple
      modules)
- [ ] Renderer is idempotent — calling it twice with the same config
      produces the same DOM
- [ ] CSS uses `var(--token-name)` so skin switching re-styles cleanly
- [ ] Detector case maps your widget type(s) and extracts sensible
      defaults from `data-settings` JSON

## Common pitfalls

- **Field IDs must be JSON-safe.** Use camelCase. No dashes, no dots.
- **Default config keys must match schema keys exactly.** The form
  editor validates the config against the schema; missing keys cause
  UI bugs.
- **Don't reference other modules from a render function.** Modules
  are isolated by design. Cross-module communication goes via the
  event bus (Thread B).
- **Don't fetch network resources in render functions.** Render is
  called synchronously on every config change. Heavy work belongs in
  a `lazy` load strategy (future).
- **Variant IDs are global.** Don't reuse variant IDs across modules.