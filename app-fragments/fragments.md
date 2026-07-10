---
id: fvcms.fragments.index.001
freshvibe_way_version: v8
date: 2026-07-09
last_rewritten: 2026-07-10 (plain-language pass per operator)
---

# FreshVibe CMS — feature index

Every feature in the package is listed here. A feature is a self-contained, reusable piece of the editor or engine. The convention is: one folder per feature, with a `fragment.md` describing what it does and an entry point (the actual code).

This file is the index. To find a feature, scan the table or grep the headers.

---

## Area 1: Editor features

The click-to-edit experience. This is the area we're building right now. Removing any one of these would break the editor's value, which is why they're grouped together as one area.

| Feature | Status | What it does | Where it lives |
|---|---|---|---|
| `editor-shell` | active | Opens a panel that edits one module instance. The single-instance inspector. | `runtime/editor-shell.js` |
| `inline-editor` | active | Makes a text element editable on click. Writes back through the scope system on blur/Enter. | `runtime/inline-editor.js` |
| `form-editor` | active | Renders a form from a module's config schema. The body of the editor-shell. | `runtime/form-editor.js` |
| `region-editor` | active | Edits a region's settings (background, padding, max-width, text colour). The body of the region panel. | `runtime/region-editor.js` |
| `region-overlay` | active | Shows one panel per region with a yellow tag overlay. | `runtime/visualizer.js` |
| `outline-system` | partial | The yellow outline + region tag visible when dev mode is on. | `panel-bridge.css` + `runtime/visualizer.js` |
| `editor-outline` | active | Floating yellow tags on each region and module. Click to focus. Selection highlight with purple accent. Contract: `app-fragments/editor-outline/fragment.md`. 10/10 smoke tests pass. | `runtime/outline.js` |
| `editor-navigator` | active | Structure tree walker. Mirrors live DOM (Elementor, Gutenberg, Webflow tokens). Click selects, drag reorders. Contract: `app-fragments/editor-navigator/fragment.md`. 23/23 smoke tests pass. | `runtime/navigator.js` |
| `editor-inspector` | active | The panel that edits one module instance — Fields / Variants / Raw JSON tabs. Auto-opens on module selection. Contract: `app-fragments/editor-inspector/fragment.md`. 24/24 smoke tests pass. | `runtime/editor-shell.js` |
| `editor-context-menu` | active | Right-click menu for regions and modules — Edit, Duplicate, Rename, Move, Delete. Contract: `app-fragments/editor-context-menu/fragment.md`. 24/24 smoke tests pass. | `runtime/context-menu.js` |
| `editor-breadcrumb` | active | Bottom-bar path: Page › Region › Section › Module. Click to jump. Contract: `app-fragments/editor-breadcrumb/fragment.md`. 22/22 smoke tests pass. | `runtime/breadcrumb.js` |
| `selection` | active | The shared selection state — which module or region is currently focused. Read by outline, inspector, navigator, breadcrumb, context-menu. Singleton at `window.FreshVibeCmsSelection`. Contract: `app-fragments/editor-selection/fragment.md`. 27/27 smoke tests pass. | `runtime/selection.js` |
| `structure-tree` | partial | The Navigator tab inside the CMS panel. Walks live DOM, supports click-to-jump. | `runtime/cms-panel.js` (structure-tab branch) |
| `cms-panel` | partial | The dock panel with Overview / Structure / Inspector tabs. | `runtime/cms-panel.js` |
| `breadcrumb` | planned | Bottom-bar path: page > region > section > module. | (no entry point yet) |
| `context-menu` | planned | Right-click menu: duplicate, delete, rename, move. | (no entry point yet) |
| `undo-stack` | active | 20-entry undo. Replay last N putModule() calls in reverse. | `runtime/cms-panel.js` (`__oscarCmsUndo`) |

**Selection is the dependency backbone.** Outline highlights the selected element, inspector edits the selected module, navigator sets selection on click, breadcrumb reflects the selection path, context-menu acts on the selection. Without `selection` as a first-class feature, these dependencies are implicit.

**TODO (per operator plan v4):** break `cms-panel.js` into separate `app-fragments/editor-*/` folders. Each feature gets its own contract.

---

## Area 2: Runtime engine

The plumbing that makes everything work. Removing the renderer or the scope system would break every consumer, so they live together.

| Feature | Status | What it does | Where it lives |
|---|---|---|---|
| `store` | active | IndexedDB-backed reactive store. `getModule`, `putModule`, `getPage`, `putRegion`, etc. | `runtime/store.js` |
| `scope` | active | Field-level write protection. `assertOp()` throws on unauthorised field writes. | `runtime/scope.js` |
| `renderer` | active | The Stage F renderers. Non-destructive in-place patches. | `runtime/renderer.js` |
| `region-renderer` | active | Region-level renderer. Reads Region.config, applies padding/background to the section element. | `runtime/region-renderer.js` |
| `config-from-dom` | active | Generic plugin: `registerConfigAdapter(type, fn)` + `populateAll(store)`. | `runtime/config-from-dom.js` |
| `default-config-adapters` | active | 15 built-in adapters: heading, paragraph, image, button, cta, testimonial, … | `runtime/default-config-adapters.js` |
| `load-annotation` | active | `loadAnnotation(annotation)` seeds pages / regions / modules into the store. | `runtime/load-annotation.js` |
| `skin-system` | active | Theme + skin. `applySkin`, `registerSkin`, `renderSkinPicker`, `listSkins`. | `runtime/skin.js` |
| `panel-manager-bridge` | active | Detects whether PanelManager is available (window.PanelManager || window.OscarPanelManager) and calls it. No fallback CSS overlay system. | `runtime/visualizer.js` (api lookup) + `runtime/editor-shell.js` |
| `query` | partial | Scope-based queryable reads. `query(store, selector)`. Used by the Stencil runtime. | `runtime/query.js` |

**TODO:** add a `fragment.md` to each of these. Each gets its own contract.

---

## Area 3: Layout modules (the canonical 15+ building blocks)

Each module is a cluster of features: render + edit + DOM-config adapter. Removing the edit would break the module's value.

| Module | Status | What it does | Where it lives |
|---|---|---|---|
| `heading` | active | H1-H6 heading with level, text, colour, alignment, font. | `modules/heading.js` |
| `paragraph` | active | Body paragraph with text, alignment, colour, line-height. | `modules/paragraph.js` |
| `image` | active | Image with src, alt, caption, link, alignment. | `modules/image.js` |
| `button` | active | CTA button with text, url, style (primary/secondary/ghost), size. | `modules/button.js` |
| `carousel` | active | Multi-card carousel. Slides + animation. | `modules/carousel.js` |
| `cta` | active | Call-to-action block. | `modules/cta.js` |
| `cta-box` | active | Card-style CTA. | `modules/cta-box.js` |
| `testimonial` | active | Quote + author + role. | `modules/testimonial.js` |
| `accordion` | active | Collapsible content. | `modules/accordion.js` |
| `icon-list` | active | List with icons. | `modules/icon-list.js` |
| `info-box` | active | Title + body + icon. | `modules/info-box.js` |
| `menu` | active | Navigation menu. | `modules/menu.js` |
| `social-icons` | active | Social media icon row. | `modules/social-icons.js` |
| `video` | active | Embedded video. | `modules/video.js` |
| `contact-form` | active | Contact form. | `modules/contact-form.js` |
| `breadcrumb` | active | Breadcrumb nav. | `modules/breadcrumb.js` |

**TODO:** add a `fragment.md` to each. Each gets a description, field list, and defaults.

---

## Area 4: Framework adapters (one per page-builder ecosystem)

These are the only place in the package that's allowed to mention specific page-builder CSS classes. They translate a page from any ecosystem into the canonical regions + modules format.

| Adapter | Status | What it does | Where it lives |
|---|---|---|---|
| `elementor` | active | Detects Elementor-rendered pages. Outputs pages / regions / modules. | `detectors/elementor.js` |

**TODO:** add adapters for Gutenberg, Webflow, Bricks, plain HTML, Shopify Liquid as the need arises. Each gets its own `fragment.md` and folder.

---

## Stubs — features that don't exist yet

These are placeholder entries. They exist so we don't pretend the gaps aren't there, but there's no code behind them.

| Feature | Where it will live | Why it's a stub |
|---|---|---|
| Content Types (post types) | `app-fragments/content-types/` (future) | WP-style post types. Need real schemas to model — Oscar-web doesn't have post types today. |
| Queries | `app-fragments/queries/` (future) | List widgets ("latest 3 books"). Need content-types first. |
| Templates | `app-fragments/templates/` (future) | Stitch — page = cover + cards + query. Need queries first. |
| Post types (admin UI) | `app-fragments/post-types/` (future) | The WordPress admin list view. NOT in scope of frontend-editing. |
| App-Recipe | `app-recipe/` (per FreshVibe Way V8 §5) | The portable package. Will be added when freshvibe-cms reaches full V8 compliance (operator chose light compliance 2026-07-09 — only pact + fragments). |
| App-Trace Atlas | `app-trace-atlas/atlas.json` (per FreshVibe Way V8 §2.1.5) | The UI → behaviour → module → file → test mapping. Will be added in a later phase. |
| App-VP tests | `app-vp/validity/` + `app-vp/protection/` (per FreshVibe Way V8 §2.1.7) | Validity + protection tests. Currently only smoke tests in `tests/`. |
| App-DNA | `app-dna/app.dna.json` (per FreshVibe Way V8 §2.1.4) | Identity + lineage. To be added when first shipped-to-app consumer is verified. |

See `stubs/` for the placeholder files.

---

## What this index is NOT

- Not a feature roadmap. Stubs above are intentionally **not** features yet.
- Not a module list for the editor UI. This is the source-of-truth map of what code exists.
- Not exhaustive of every file in the package — it covers the major features and area groupings. Pure utility files (e.g. small helpers) are listed in `stubs/` or omitted.

---

## Where to look

- `app-pact.md` — the rules
- `invariants.md` — the testable rules
- `stubs/` — placeholder features
- `README.md` — package entry point
- `runtime/`, `modules/`, `detectors/` — the actual code