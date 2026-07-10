---
id: fvcms.fragments.index.001
freshvibe_way_version: v8
date: 2026-07-09
---

# FreshVibe CMS — App-Fragments Index

> **V8 alignment (per FreshVibe Way V8 §2.1.3):** each fragment is a self-contained unit. Fragment folder = `fragment.md` (the V4 contract: id, purpose, inputs, outputs, dependencies, invariants) + entry point source.
>
> **Anti-drift rule 3 (V8 §8):** fragments below document what **EXISTS today**, not what we'd like to build. Future fragments get a `stubs/` entry until they're built.

---

## Module 1: frontend-editing (the editor itself)

The editor is a **cluster of features** per V8 §10.1. Removing the inspector would break the editor's value, so it IS a cluster, not a single feature.

| Fragment id | Status | Purpose | Entry point |
|---|---|---|---|
| `fragment.editor-shell` | active | Open a PanelManager panel that edits one module instance. Single-instance inspector. | `runtime/editor-shell.js` |
| `fragment.inline-editor` | active | Make a text element editable on click. Writes back through the scope system on blur/Enter. | `runtime/inline-editor.js` |
| `fragment.form-editor` | active | Render a form from a module's config schema. The body of editor-shell. | `runtime/form-editor.js` |
| `fragment.region-editor` | active | Edit a region's config (background, padding, max-width, text colour). Body of the region panel. | `runtime/region-editor.js` |
| `fragment.region-overlay` | active | Show one PanelManager panel per region. Yellow region tag overlay on dev mode. | `runtime/visualizer.js` |
| `fragment.outline-system` | partial | Yellow outline + region tag visible on dev mode. Lives in `panel-bridge.css` + `visualizer.js`. | `panel-bridge.css` + `runtime/visualizer.js` |
| `fragment.selection` | active | The shared selection state. Tracks which module/region is currently selected. Read by outline-system (highlights), inspector (reads), navigator (sets on click), breadcrumb (reflects), context-menu (acts on). Singleton at `window.FreshVibeCmsSelection`. Contract: `app-fragments/editor-selection/fragment.md`. 27/27 smoke tests pass. | `runtime/selection.js` |
| `fragment.structure-tree` | partial | The Navigator tab inside the CMS panel. Walks live DOM, supports click-to-jump. | `runtime/cms-panel.js` (structure-tab branch) |
| `fragment.cms-panel` | partial | The dock panel with Overview / Structure / Inspector tabs. | `runtime/cms-panel.js` |
| `fragment.breadcrumb` | planned | Bottom-bar path: page > region > section > module. | (no entry point yet) |
| `fragment.context-menu` | planned | Right-click menu: duplicate, delete, rename, move. | (no entry point yet) |
| `fragment.undo-stack` | active | 20-entry undo. Replay last N putModule() calls in reverse. | `runtime/cms-panel.js` (`__oscarCmsUndo`) |

**Selection is the dependency backbone.** Per the v4 plan (and Copilot's review 2026-07-09): outline highlights the selected element, inspector edits the selected module, navigator sets selection on click, breadcrumb reflects the selection path, context-menu acts on the selection. Without `fragment.selection` as a first-class fragment, these dependencies are implicit.

**TODO (per operator plan v4):** break `cms-panel.js` into separate `app-fragments/editor-*/fragment.md` folders. Each fragment gets its own contract.

---

## Module 2: runtime (the engine)

The runtime is a **cluster** because removing the renderer or the scope system would break every consumer.

| Fragment id | Status | Purpose | Entry point |
|---|---|---|---|
| `fragment.store` | active | IndexedDB-backed reactive store. `getModule`, `putModule`, `getPage`, `putRegion`, etc. | `runtime/store.js` |
| `fragment.scope` | active | Field-level write protection. `assertOp()` throws on unauthorised field writes. | `runtime/scope.js` |
| `fragment.renderer` | active | The Stage F renderers. Non-destructive in-place patches. | `runtime/renderer.js` |
| `fragment.region-renderer` | active | Region-level renderer. Reads Region.config, applies padding/background to the section element. | `runtime/region-renderer.js` |
| `fragment.config-from-dom` | active | Generic plugin: `registerConfigAdapter(type, fn)` + `populateAll(store)`. | `runtime/config-from-dom.js` |
| `fragment.default-config-adapters` | active | 15 built-in adapters: heading, paragraph, image, button, cta, testimonial, … | `runtime/default-config-adapters.js` |
| `fragment.load-annotation` | active | `loadAnnotation(annotation)` seeds pages / regions / modules into the store. | `runtime/load-annotation.js` |
| `fragment.skin-system` | active | Theme + skin. `applySkin`, `registerSkin`, `renderSkinPicker`, `listSkins`. | `runtime/skin.js` |
| `fragment.panel-manager-bridge` | active | Detects whether PanelManager is available (window.PanelManager || window.OscarPanelManager) and calls it. No fallback CSS overlay system. | `runtime/visualizer.js` (api lookup) + `runtime/editor-shell.js` |
| `fragment.query` | partial | Scope-based queryable reads. `query(store, selector)`. Used by the Stencil runtime. | `runtime/query.js` |

**TODO (per operator plan v4):** add `fragment.md` files to each of these. Each gets its own contract.

---

## Module 3: layout modules (the canonical 15+ layouts)

Each module is a cluster of features: render + edit + DOM-config adapter. Removing the edit would break the module's value.

| Fragment id | Status | Purpose | Entry point |
|---|---|---|---|
| `fragment.module.heading` | active | H1-H6 heading with level, text, colour, alignment, font. | `modules/heading.js` |
| `fragment.module.paragraph` | active | Body paragraph with text, alignment, colour, line-height. | `modules/paragraph.js` |
| `fragment.module.image` | active | Image with src, alt, caption, link, alignment. | `modules/image.js` |
| `fragment.module.button` | active | CTA button with text, url, style (primary/secondary/ghost), size. | `modules/button.js` |
| `fragment.module.carousel` | active | Multi-card carousel. Slides + animation. | `modules/carousel.js` |
| `fragment.module.cta` | active | Call-to-action block. | `modules/cta.js` |
| `fragment.module.cta-box` | active | Card-style CTA. | `modules/cta-box.js` |
| `fragment.module.testimonial` | active | Quote + author + role. | `modules/testimonial.js` |
| `fragment.module.accordion` | active | Collapsible content. | `modules/accordion.js` |
| `fragment.module.icon-list` | active | List with icons. | `modules/icon-list.js` |
| `fragment.module.info-box` | active | Title + body + icon. | `modules/info-box.js` |
| `fragment.module.menu` | active | Navigation menu. | `modules/menu.js` |
| `fragment.module.social-icons` | active | Social media icon row. | `modules/social-icons.js` |
| `fragment.module.video` | active | Embedded video. | `modules/video.js` |
| `fragment.module.contact-form` | active | Contact form. | `modules/contact-form.js` |
| `fragment.module.breadcrumb` | active | Breadcrumb nav. | `modules/breadcrumb.js` |

**TODO:** add `fragment.md` to each. Each gets id, purpose, fields, defaults.

---

## Module 4: detectors (framework adapters)

| Fragment id | Status | Purpose | Entry point |
|---|---|---|---|
| `fragment.detector.elementor` | active | Detect Elementor-rendered pages. Output pages / regions / modules. | `detectors/elementor.js` |

**TODO:** add detectors for Gutenberg, Webflow, Bricks, plain HTML, Shopify Liquid as the need arises. Each gets a `fragment.md`.

---

## Stubs (V8 §8 anti-drift rule 3: name the gaps, don't pretend they don't exist)

Per operator choice 2026-07-09, these are **named** with placeholders, no code:

| Stub | Where it will live | Why it's a stub |
|---|---|---|
| Content Types (post types) | `app-fragments/content-types/` (future) | WP-style post types. Need real schemas to model — Oscar-web doesn't have post types today. |
| Queries | `app-fragments/queries/` (future) | List widgets ("latest 3 books"). Need content-types first. |
| Templates | `app-fragments/templates/` (future) | Stitch — page = cover + cards + query. Need queries first. |
| Post types (admin UI) | `app-fragments/post-types/` (future) | The WordPress admin list view. NOT in scope of frontend-editing. |
| App-Recipe | `app-recipe/` (per V8 §5) | The portable package. Will be added when freshvibe-cms reaches full V8 compliance (operator chose light compliance 2026-07-09 — only pact + fragments). |
| App-Trace Atlas | `app-trace-atlas/atlas.json` (per V8 §2.1.5) | The UI → behaviour → module → file → test mapping. Will be added in a later phase. |
| App-VP tests | `app-vp/validity/` + `app-vp/protection/` (per V8 §2.1.7) | Validity + protection tests. Currently only smoke tests in `tests/`. |
| App-DNA | `app-dna/app.dna.json` (per V8 §2.1.4) | Identity + lineage. To be added when first shipped-to-app consumer is verified. |

See `stubs/` for the placeholder files.

---

## What this index is NOT

- Not a feature roadmap. Stubs above are intentionally **not** features yet.
- Not a module list for the editor UI. This is the source-of-truth map of what code exists.
- Not exhaustive of every file in the package — it covers the modules and significant runtime fragments. Pure utility files (e.g. small helpers) are listed in `stubs/` or omitted.

---

## Cross-references

- `app-pact.md` — the master pact
- `invariants.md` — the 10 invariants
- `stubs/` — placeholder content
- `README.md` — package entry point
- `runtime/`, `modules/`, `detectors/` — the actual code