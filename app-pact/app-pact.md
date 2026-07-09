---
id: fvcms.pact.constitution.001
freshvibe_way_version: v8
date: 2026-07-09
---

# FreshVibe CMS — App-Pact

> **V8 alignment (per FreshVibe Way V8 §1):** freshvibe-cms is a **subsystem** (level 4 in the V8 hierarchy). It adopts multiple modules (level 3). The pact below governs the subsystem as a whole.
>
> This file is one of the V8 mandatory artefacts (light compliance — pact + fragments only, per operator choice 2026-07-09).

---

## 1. What FreshVibe CMS is

FreshVibe CMS is a **frontend editing runtime** that lets site authors click on a page region and edit its content (text, images, buttons, headings, layouts) in place, with no rebuild step.

It is **not** a content management system in the WordPress sense. It is the **frontend editing layer** of one — the thing you see when you're inside the editor, not the admin list of post types.

It is **not** a page builder. The operator has decided it should not clone Elementor wholesale — it's a frontend CMS that "in parts looks a bit like Elementor but not really."

It **is** a runtime that any HTML page can opt into. The host site declares what regions exist, what modules live in each region, and FreshVibe CMS provides the click-to-edit overlays, the inspector panel, the structure tree, and the save round-trip.

---

## 2. Hierarchy (V8 §10 — constitutional)

freshvibe-cms contains these modules (siblings, not nested):

| Module | Role | Where it lives |
|---|---|---|
| **frontend-editing** | The editor itself — outline, inspector, navigator, breadcrumb, context menu | `app-fragments/editor-*/` |
| **content-types** | (STUB) post types: book, lesson, recipe, page | `app-fragments/content-types/` |
| **queries** | (STUB) list widgets: "latest 3 books", "all recipes by tag" | `app-fragments/queries/` |
| **templates** | (STUB) Stitch — page = cover + 3 cards + query | `app-fragments/templates/` |
| **runtime** | Renderers, scope, store, region rendering — the engine | `runtime/` (existing) |
| **modules** | The 15+ canonical layouts (heading, paragraph, image, button, …) | `modules/` (existing) |
| **detectors** | Framework-specific adapters (Elementor, Gutenberg, Webflow) | `detectors/` (existing) |

**Each module is a cluster of related features per V8 §10.1.** A frontend-editing module would lose value if you removed the inspector — so it IS a cluster, not a single feature.

---

## 3. Invariants

The following MUST always be true of freshvibe-cms:

### 3.1 Two-tier architecture — generic core + framework-aware renderers

freshvibe-cms has **two layers** that mirror the consumer split:

**Layer A — Generic core** (must be framework-agnostic):
- `runtime/store.js`, `runtime/scope.js`, `runtime/load-annotation.js`, `runtime/config-from-dom.js`, `runtime/default-config-adapters.js`, `runtime/region-renderer.js`, `runtime/region-editor.js`, `runtime/skin.js`, `runtime/panel-manager/*`, `bootstrap.js`, `modules/`, `app-fragments/`
- MUST NOT contain the words `Elementor`, `WordPress`, `Gutenberg`, `Bricks`, `Webflow`, `Beaver`, `WPBakery`, `Divi`.

**Layer B — Framework-aware renderers** (`runtime/renderer.js`):
- Generic renderers (heading, image, paragraph, cta, menu, accordion, social-icons, icon-list, info-box, video, contact-form, breadcrumb) are framework-agnostic.
- A small number of renderers (currently `M-button`, `M-testimonial`) probe for Elementor/EAEL class names as **fallback selectors**. These fall back gracefully — plain HTML still works.

**Migration target (parked):** framework-aware selectors move to `runtime/renderer-adapters/` (a plugin folder). Consumer apps ship their own adapters. Tracked as `stubs/renderer-adapters.md`.

**Why this split:** the engine must work in any HTML site. But Oscar-web has Elementor + EAEL today — making every consumer ship a fork is worse than a small fallback path in the runtime.

See `invariants.md §I-001` for the formal test and the migration plan.

### 3.2 Non-destructive rendering
- The Stage F renderer MUST patch DOM in place. It MUST NOT `innerHTML = ''` to re-render from scratch.
- **Why:** host framework CSS classes (EAEL, Elementor, Gutenberg block CSS) survive the edit. The visual identity of the page is preserved.

### 3.3 Modules are canonical, instances are user-renamed
- `moduleDef.id` is canonical (e.g. `heading`, `paragraph`, `image`).
- The user-facing instance name lives in `moduleInstance.displayLabel` and `moduleInstance.legacyConfig.__instanceName`.
- Renaming an instance MUST NOT change its canonical type.

### 3.4 The runtime never edits the DOM itself
- The runtime provides: store, renderers, scope, region rendering, config adapters.
- The runtime MUST NOT touch DOM elements that aren't its own overlays (region outlines, panel manager UI).
- **Why:** if the runtime starts scraping/editing host DOM, it becomes coupled to a specific host.

### 3.5 Save = idempotent round-trip
- Every edit produces a `putModule`/`putRegion` call.
- The round-trip is idempotent — replaying the same edit produces the same DOM.
- **Why:** undo is just "replay last N round-trips in reverse."

### 3.6 Panel manager owns all overlays
- Region outlines, CMS panel, inspector panels — ALL use the same PanelManager singleton.
- **Why:** one drag/dock/slim-pill behaviour, not five competing CSS systems. Anti-drift rule 1: verify the current state in the browser; the panel manager already exists.

---

## 4. Constraints (what MUST NOT happen)

- MUST NOT add features "for the operator's convenience" (V8 anti-drift rule 3). Refactor what exists.
- MUST NOT call freshvibe-cms a "module" — it's a subsystem (V8 §10).
- MUST NOT promote a single feature (e.g. "the rename button") to a module. It's a chip.
- MUST NOT touch host DOM outside the editor's own overlays.
- MUST NOT use `innerHTML = ''` to re-render — that's destructive.
- MUST NOT introduce a parallel panel system to the PanelManager.

---

## 5. Guarantees (what the runtime promises)

- Any HTML page with `<script type="module" src="bootstrap.js">` plus an `annotation.json` will get the frontend editing experience.
- Clicking a region shows its inspector.
- Clicking a module inside a region opens its editor shell.
- The structure tree mirrors the live DOM tree (Elementor/Gutenberg/Webflow tokens all supported).
- Edits apply in place — no page reload, no SSR round-trip.
- Undo is always available (capped stack, 20 entries).

---

## 6. Anti-drift rules (V8 §8)

1. **Verify-before-refactor** — for every change, prove the current state in a browser (curl, Playwright, manual check) BEFORE editing.
2. **Safe Diff Protocol** — atomic commits, divergence logs in commit messages, shadow versions of old code.
3. **No invention** — only refactor what exists. New features get their own commit with operator sign-off.
4. **Explicit binary verification** — every change has a test (Playwright, vitest, curl-based).
5. **DOM hierarchy verification** — the structure is preserved (heading stays heading, section stays section).
6. **Behaviour/state verification** — same inputs produce same outputs.
7. **Drift detection** — every commit checks `git diff` and confirms the intent matches.

---

## 7. What freshvibe-cms is NOT

- Not WordPress. No post type admin UI. No admin user roles. No settings menu.
- Not a content management system in the CMS sense. It's the frontend editing layer.
- Not Elementor. Not Bricks. Not Divi. We borrow patterns, not wholesale clones.
- Not an SSR runtime. The page is already rendered — FreshVibe CMS overlays it.
- Not coupled to any specific framework. Detectors per framework, runtime agnostic.

---

## 8. Consumers

Apps that consume freshvibe-cms:

| Consumer | Status | Notes |
|---|---|---|
| **Oscar-web** (`avidtech6/oscar-web`) | active consumer | Elementor + EAEL detector glue. The host-specific stuff lives in Oscar-web, not here. |
| **FreshVibe Studio** | future | Stencil output. |
| **Plain HTML** | future | Any HTML page with an annotation.json. |
| **Shopify Liquid** | future | Liquid output. |
| **Webflow** | future | Webflow-detected sites. |

Consumers MAY override any fragment if their override % is under 20% (light), 20-50% (mirror), or >50% (fork). Per V8 §10.3.

---

## 9. Lifecycle

```
HTML page loads
  → bootstrap.js runs
  → initCms() opens the IndexedDB store
  → loadAnnotation(annotation) seeds pages / regions / modules
  → ensureDefaultAdapters() registers DOM-config adapters
  → populateAll(store) reads live DOM and fills in legacyConfig for each module
  → connect() binds each module to its DOM element (.elementor-element-{id} etc.)
  → subscribeToStore() makes any putModule() trigger a re-render
  → showRegionOverlays() spawns one PanelManager panel per region
```

After this, the page is editable. Click → inspector opens → edit → save → patch in place.

---

## 10. Cross-references

- `freshvibe-way-v8/` — the canonical pact
- `invariants.md` — the formal invariant list (extends §3 above)
- `app-fragments/fragments.md` — the fragment index
- `stubs/` — explicit placeholders for content-types, queries, templates, post-types
- `README.md` — package entry point
- `docs/module-authoring.md` — how to write a new module
- `docs/ai-integration.md` — how AI integrates (Phase 4.3 forward)