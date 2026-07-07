# FreshVibe CMS

A site-aware, AI-safe, module-scoped CMS layer that runs on top of any
reconstructed static site. Oscar's Tree Academy is the first consumer.

## Status

**v0.2.0 — annotate + edit what's there.**

- 10 canonical modules (Heading, CTA, Image, Paragraph, Video, Carousel,
  Menu, Social icons, Accordion, Icon list)
- Store with IndexedDB persistence + scope resolver
- Elementor + EAEL detector (10 widget types mapped)
- Annotation script that scans a dist → JSON
- Annotation loader for runtime use
- Generic form editor for any module schema
- Inline text editor with field-level scope safety
- Bootstrap module that wires everything into a host page
- Annotation of Oscar's dist: **25 pages, 249 regions, 418 groups, 265 modules**
- v0.2 items remaining: full region navigator in dev panel, more inline
  edit coverage, module re-renderer, tests

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Runtime (universal)                   │
│  Region/Group/Module store, scope resolver,     │
│  field-level editor, skin system.               │
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

See `schemas/data-model.md` for the full shapes.

## Use it

### Step 1: annotate your dist

```bash
node scripts/annotate.js /path/to/your/dist ./annotation.json
```

Generates `annotation.json` with all pages, regions, groups, modules.

### Step 2: serve annotation.json alongside your pages

E.g. `dist/annotation.json` or any URL your pages can fetch.

### Step 3: boot the CMS in your page

```html
<script type="module">
  import { bootFreshvibeCms } from './freshvibe-cms/bootstrap.js';
  await bootFreshvibeCms({ annotationUrl: '/annotation.json' });
</script>
```

That's it. The CMS:
- Loads the annotation into IndexedDB
- Wires inline editing on detected heading text
- Exposes `window.__fvcmsOpenEditor(moduleInstanceId)` for opening the form editor

### Step 4: integrate with your dev panel

In your existing dev panel, call `host.mountNavigator(navigatorEl)` to
get a region/group/module navigator mounted into your UI.

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

## Detected but not yet supported (Oscar inventory)

These widget types exist in Oscar's dist but don't have canonical modules
yet — they'd need new modules added to the library:

- `css`, `container`, `mobile`, `spacer` — chrome/layout, low priority
- `form`, `eael-fluentform`, `eael-weform` — forms (different concern)
- `eael-info-box`, `eael-cta-box`, `eael-countdown`, `eael-protected-content`,
  `eael-data-table`, `eael-adv-tabs`, `eael-post-block`, `eael-breadcrumbs`,
  `eael-testimonial` (premium-addon) — extras
- `theme-post-title`, `theme-post-content`, `post-navigation` — WordPress theme widgets
- `template`, `shortcode` — generic placeholders

## Repo layout

```
freshvibe-cms/
├── README.md                    # this file
├── schemas/
│   └── data-model.md            # canonical shapes
├── modules/                     # universal module library
│   ├── index.js                 # barrel
│   ├── heading.js
│   ├── cta.js
│   ├── image.js
│   ├── paragraph.js
│   ├── video.js
│   ├── carousel.js
│   ├── menu.js
│   ├── social-icons.js
│   ├── accordion.js
│   └── icon-list.js
├── detectors/                   # stack-specific
│   └── elementor.js
├── runtime/                     # universal runtime
│   ├── index.js                 # public API
│   ├── store.js                 # IndexedDB-backed store
│   ├── scope.js                 # scope resolver + ops policy
│   ├── load-annotation.js       # JSON loader
│   ├── form-editor.js           # generic form editor
│   ├── inline-editor.js         # inline text edit
│   └── styles.css               # scoped styles
├── scripts/
│   └── annotate.js              # dist → annotation.json
├── bootstrap.js                 # entry point for host sites
└── annotation.json              # generated by annotate.js (Oscar's dist)
```

## Roadmap

- [x] **v0.1** — foundation: data model + 3 modules + Elementor detector stub
- [x] **v0.2** — annotate + edit what's there (annotation script, 10 modules,
       form editor, inline editor, bootstrap)
- [ ] **v0.3** — skins + manual group→module toggle + module re-renderer
- [ ] **v1.0** — tests + docs + AI integration spec
- [ ] **v2.0 (Thread B — Oscar platform)** — auth + gating + progress + quiz module

## License

Operator-internal. Same as the rest of FreshVibe.