# FreshVibe CMS

A site-aware, AI-safe, module-scoped CMS layer that runs on top of any
reconstructed static site. Oscar's Tree Academy is the first consumer.

## Status

**v0.3.0 — skins + group toggle + DOM re-renderer + editor polish.**

- 10 canonical modules (Heading, CTA, Image, Paragraph, Video, Carousel,
  Menu, Social icons, Accordion, Icon list)
- Store with IndexedDB persistence + scope resolver
- Elementor + EAEL detector with proper nesting + unique IDs
- Annotation script that scans a dist → JSON
- Annotation loader for runtime use
- Generic form editor + improved shell (tabs, variants preview, raw JSON)
- Inline text editor with field-level scope safety
- **DOM re-renderer**: edits show live in the page
- **Skins system**: 2 sample skins + skin picker
- **Group → module manual toggle**: operator UI to promote/demote
- **Region visualiser**: dashed overlays with labels, click-to-jump
- Bootstrap module that wires everything into a host page
- Smoke tests (49/49 passing)

## What's new in v0.3

### DOM re-renderer
Every module has a `render(instance, def, skin)` function that patches
the live DOM when config changes. Editing "Learn more" → "Read more"
in a CTA module updates the page text instantly without reload.

### Skins
A skin is `{moduleDefaults: ..., cssTokens: ...}`. Apply one and the
runtime:
1. Sets CSS custom properties on `:root`
2. Overrides module defaults where the instance hasn't explicitly set
   a field (operator overrides win)
3. Triggers a re-render of all modules

Two sample skins:
- **Reign** (sharp corners, serif headings, forest green)
- **BuddyX** (rounded corners, sans-serif, soft blue)

### Group → module toggle
Operator can mark any group as a module (or not) and pick its type.
Auto-detect may come later as a suggestion, never auto-promote.

### Region visualiser
Toggle dashed overlays showing each region's boundary with label +
group-count badge. Hover highlights gold. Click jumps to the region
in the navigator.

### Editor shell
Modal with three tabs: Fields (form), Variants (preset list with Apply
buttons), Raw JSON (live-parsed JSON editor with syntax-error feedback).

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Runtime (universal)                   │
│  Region/Group/Module store, scope resolver,     │
│  re-renderer, skins, visualizer, form editor,   │
│  inline editor, group toggle, scope system.     │
│  → No stack-specific code here.                 │
└─────────────────────────────────────────────────┘
                    ▲
                    │ uses
┌─────────────────────────────────────────────────┐
│           Modules (typed components)            │
│  Heading, CTA, Image, Paragraph, Video,         │
│  Carousel, Menu, Social icons, Accordion,       │
│  Icon list.                                     │
│  → Universal. Stack-agnostic.                   │
└─────────────────────────────────────────────────┘
                    ▲
                    │ matches
┌─────────────────────────────────────────────────┐
│           Detectors (stack-specific)            │
│  elementor.js → Elementor + EAEL                │
│  shopify.js    → Shopify Liquid output          │
│  raw-html.js   → generic semantic HTML          │
│  → Stack-specific knowledge lives ONLY here.    │
└─────────────────────────────────────────────────┘
```

## Layer separation rule

> The runtime never contains the word "Elementor", "WordPress",
> "Shopify", "Webflow", or "Next.js".
> The modules never contain those words either.
> Only the detector knows.

## Data model

See `schemas/data-model.md`.

## Use it

### Step 1: annotate your dist

```bash
node scripts/annotate.js /path/to/your/dist ./annotation.json
```

### Step 2: serve annotation.json alongside your pages

### Step 3: boot the CMS in your page

```html
<script type="module">
  import { bootFreshvibeCms } from './freshvibe-cms/bootstrap.js';
  await bootFreshvibeCms({ annotationUrl: '/annotation.json' });
</script>
```

That gives you:
- Region overlays (click "Show regions" in dev panel)
- Module navigator (region → group → module buttons)
- Inline editing on heading text (click to edit, blur to save)
- Skin picker (live preview)
- Group → module toggle
- Click a module button → modal editor (Fields / Variants / Raw JSON)

## Module library

| ID | Label | Elementor widgets mapped |
|---|---|---|
| `M-heading` | Heading | heading, animated-headline |
| `M-cta` | CTA button | button, eael-creative-button |
| `M-image` | Image | image, eael-image |
| `M-paragraph` | Paragraph | text-editor |
| `M-video` | Video | video, eael-video |
| `M-carousel` | Carousel | eael-post-carousel, eael-team-member-carousel, eael-stacked-cards |
| `M-menu` | Menu | eael-simple-menu |
| `M-social-icons` | Social icons | social-icons |
| `M-accordion` | Accordion | eael-adv-accordion, eael-toggle |
| `M-icon-list` | Icon list | icon-list |

## Skins

| ID | Label | Style |
|---|---|---|
| `skin-reign` | Reign (default) | Sharp corners, serif, forest green |
| `skin-buddYx` | BuddyX | Rounded corners, sans-serif, soft blue |

## Repo layout

```
freshvibe-cms/
├── README.md                    # this file
├── schemas/
│   └── data-model.md
├── modules/                     # universal module library (10)
├── detectors/                   # stack-specific (elementor.js)
├── runtime/
│   ├── index.js                 # public API
│   ├── store.js                 # IndexedDB-backed store
│   ├── scope.js                 # scope resolver + ops policy
│   ├── load-annotation.js       # JSON loader
│   ├── form-editor.js           # generic form editor
│   ├── editor-shell.js          # improved modal shell v0.3
│   ├── inline-editor.js         # inline text edit
│   ├── renderer.js              # DOM re-renderer v0.3
│   ├── skin.js                  # skin system v0.3
│   ├── visualizer.js            # region overlays v0.3
│   ├── group-toggle.js          # group→module toggle v0.3
│   └── styles.css
├── skins/                       # sample skins v0.3
│   ├── index.js
│   ├── reign.js
│   └── buddYx.js
├── scripts/
│   └── annotate.js              # dist → annotation.json
├── bootstrap.js                 # entry point
├── annotation.json              # generated for Oscar's dist
└── tests/
    └── smoke.mjs                # 49 tests
```

## Roadmap

- [x] **v0.1** — foundation: data model + 3 modules + Elementor detector stub
- [x] **v0.2** — annotate + edit what's there (10 modules, annotation
       script, form editor, inline editor, bootstrap)
- [x] **v0.3** — skins + group toggle + DOM re-renderer + editor shell
- [ ] **v1.0** — tests + docs + AI integration spec
- [ ] **v2.0 (Thread B — Oscar platform)** — auth + gating + progress + quiz module

## License

Operator-internal.