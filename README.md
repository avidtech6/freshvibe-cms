# FreshVibe CMS

A site-aware, AI-safe, module-scoped CMS layer that runs on top of any
reconstructed static site. Oscar's Tree Academy is the first consumer.

## Status

**v0.1.0 — foundation only.** Data model + 3 canonical modules
(Heading, CTA, Image) + Elementor detector stub. UI not wired yet.

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
│  Heading, CTA, Image (v1).                      │
│  Each: schema + defaultConfig + variants.       │
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

See `schemas/data-model.md` for the full shapes. Summary:

- **Page** — keyed by URL pathname, contains ordered regions.
- **Region** — top-level container on a page (`.e-con`, `<section>`, etc.).
- **Group** — wrapper inside a region. May or may not be a module.
- **ModuleDef** — typed component (Heading, CTA, Image). Has schema + defaults + variants.
- **ModuleInstance** — one occurrence of a module on a page.
- **Skin** — bundle of module-default overrides + CSS tokens.
- **Scope** — addressable query used by AI + UI navigation.

The data model has fields for Thread B (Oscar platform):
`Region.gating`, `Module.progress`, `Runtime.currentUser`, etc.
These exist in v1 shape but are not implemented in v1 UI.

## Use it

```js
import { initCms, detectPage, getStore, resolveScope } from './runtime/index.js';
import { detectElementor } from './detectors/elementor.js';

await initCms();

await detectPage({
  pathname: location.pathname,
  html: document.documentElement.outerHTML,
  detect: detectElementor,
});

// Now store has the annotation.
const store = getStore();
const page = store.getPageByPathname(location.pathname);
console.log('regions on this page:', store.listRegionsForPage(page.id));

// Resolve a scope (used by AI safety + UI navigation)
const { targets, ops } = resolveScope({ type: 'page', pageId: page.id });
console.log('editable targets:', targets.length, 'ops:', ops);
```

## Roadmap

### v0.1 — foundation (THIS WEEK)
- [x] Data model (`schemas/data-model.md`)
- [x] 3 canonical modules: Heading, CTA, Image
- [x] Store with IndexedDB persistence
- [x] Scope resolver with ops policy
- [x] Elementor detector (stub — needs refinement)

### v0.2 — annotate + edit what's there
- [ ] Add 7 more modules (paragraph, accordion, video, carousel, menu, social, contact-form)
- [ ] Annotation script: scan dist, generate JSON, embed in build
- [ ] Module editor panel (reuses existing panel manager)
- [ ] Inline text editor on page
- [ ] Region navigator in dev panel

### v0.3 — skins + manual toggle
- [ ] Group isModule manual toggle (operator UI)
- [ ] Skin switcher UI
- [ ] 2 sample skins: Reign-style, BuddyX-style

### v1.0 — production-ready
- [ ] Tests for store, scope, detector
- [ ] Documentation for adding a new detector
- [ ] Documentation for adding a new module
- [ ] AI integration spec (how an AI agent uses scopes)

### v2.0 (Thread B — Oscar platform)
- [ ] Auth + currentUser wiring
- [ ] Gating renderer (free vs Pro)
- [ ] Progress tracking
- [ ] Quiz + Certificate module types
- [ ] Subscription gating

## Module library

| ID | Label | Schema fields |
|---|---|---|
| `M-heading` | Heading | text, level, align, color, size |
| `M-cta` | CTA button | text, href, variant, color, radius, size, openInNewTab, icon |
| `M-image` | Image | src, alt, width, align, aspectRatio, caption, link |

## Detectors

| File | Stack | Status |
|---|---|---|
| `detectors/elementor.js` | Elementor + EAEL | stub |
| `detectors/shopify.js` | Shopify Liquid | not started |
| `detectors/raw-html.js` | Generic semantic HTML | not started |

## Repo layout

```
freshvibe-cms/
├── README.md                    # this file
├── schemas/
│   └── data-model.md            # the canonical shapes
├── modules/                     # universal module library
│   ├── index.js                 # barrel
│   ├── heading.js
│   ├── cta.js
│   └── image.js
├── detectors/                   # stack-specific
│   └── elementor.js
├── runtime/                     # universal runtime
│   ├── index.js                 # public API
│   ├── store.js                 # IndexedDB-backed store
│   └── scope.js                 # scope resolver + ops policy
├── skins/                       # sample skins (later)
├── examples/                    # usage examples
└── tests/                       # tests (later)
```

## License

Operator-internal. Same as the rest of FreshVibe.