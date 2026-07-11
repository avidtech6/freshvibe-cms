---
id: fvcms.pact.constitution.001
freshvibe_way_version: v8
date: 2026-07-09
last_rewritten: 2026-07-10 (plain-language pass per operator)
---

# FreshVibe CMS — the rules of the road

This document is the **constitution** for the freshvibe-cms package. It says what the package is, what it isn't, the rules it follows, and the promises it makes to anyone using it.

If you're writing code that lives in this folder, read this first. If you want to ship a feature, the rules below tell you whether your feature fits.

---

## 1. What FreshVibe CMS is

FreshVibe CMS is a **frontend editing runtime**. You load it on an HTML page and you get the ability to click on any region of the page and edit its content (text, images, buttons, headings, layouts) right there, with no rebuild step.

Concretely, it provides:
- Yellow clickable tags floating on each region and module
- A dock panel with three tabs: Overview / Structure / Inspector
- Click any region → its inspector opens
- Click any module → its editor opens with the right fields for that type
- Save your edit → the DOM patches in place, no reload

**It is not WordPress.** There's no post-type admin list, no user roles, no settings menu. It's the editing experience inside the page, not the management UI before the page.

**It is not a page builder.** It's not Elementor, not Bricks, not Divi. We borrow some patterns from those tools (section/widget outlines, click-to-edit, inspector with fields), but we're not cloning any of them. The intent is a frontend CMS that, in places, looks a bit like Elementor but isn't.

**It is a runtime** that any HTML page can adopt. The host site declares its regions and modules via an `annotation.json`; FreshVibe CMS provides the editor overlay.

---

## 2. What's in the package

The package is organised by **feature**. Each feature is one user-facing capability (e.g. "the outline system" or "the inspector panel"). Features are grouped into bigger areas:

| Area | What it does | Where it lives |
|---|---|---|
| **Editor features** | The click-to-edit experience — outline tags, inspector panel, structure tree, breadcrumb, right-click menu, selection state | `app-fragments/editor-*/` |
| **Content types** | (placeholder) post types like Book, Lesson, Recipe | `app-fragments/content-types/` |
| **Queries** | (placeholder) list widgets like "latest 3 books" | `app-fragments/queries/` |
| **Templates** | (placeholder) page templates — "page = cover + 3 cards + query" | `app-fragments/templates/` |
| **Runtime engine** | The plumbing — store, scope, renderers, region rendering | `runtime/` |
| **Layout modules** | The 15+ canonical building blocks (heading, paragraph, image, button, …) | `modules/` |
| **Framework adapters** | One per page-builder ecosystem (only Elementor today) | `detectors/` |

The **editor features** area is the main thing we're building right now. The **content types / queries / templates** areas are placeholders — they're named so we don't pretend they don't exist, but there's no code yet because we haven't decided what shapes they should take. (See `stubs/` for details.)

The **runtime engine** and **layout modules** areas already work and are battle-tested with Oscar's Tree Academy.

---

## 3. The rules

These are non-negotiable. They exist so the package stays maintainable as features get added.

### 3.1 The engine must work in any HTML site

The runtime has **two layers** that mirror the split between generic code and framework-specific glue:

**Layer A — generic engine.** Everything that's not specific to a particular page-builder framework. This includes the store, the scope system, the region renderer, the config-from-DOM adapters, the panel manager wrapper, the layout modules, the editor features.

This layer MUST NOT mention `Elementor`, `WordPress`, `Gutenberg`, `Bricks`, `Webflow`, `Beaver`, `WPBakery`, or `Divi` in selector or classList logic. Comments that document *why* a canonical module exists (e.g. "M-button aliases EAEL creative buttons") are fine. But no runtime behaviour can depend on a specific page builder's CSS classes.

**Why:** the runtime should work in any HTML site — Elementor today, Shopify Liquid tomorrow, plain HTML next week. If Layer A leaks framework names into selectors, every consumer inherits dead code.

**Layer B — framework-aware renderers** (in `runtime/renderer.js`). Two renderers today (`M-button`, `M-testimonial`) probe for Elementor/EAEL class names as fallback selectors after trying generic ones. Plain HTML still works — the framework selectors are just there to help Elementor pages find the right DOM element.

**The migration plan:** when a second consumer (Shopify, Webflow, Bricks) needs different fallback selectors, Layer B moves to a plugin folder (`runtime/renderer-adapters/`). Each consumer ships its own adapter. Until then, the hybrid approach is simpler. (Tracked as `stubs/renderer-adapters.md`.)

### 3.2 Renderers patch in place, never replace

The Stage F renderer MUST patch DOM in place. It MUST NOT wipe a host element with `innerHTML = ''` to re-render from scratch.

**Why:** host framework CSS classes (EAEL's creative-button styling, Elementor's heading typography, Gutenberg's block CSS) must survive the edit. The visual identity of the page is preserved because we never throw it away.

### 3.3 Layout types are canonical, instances are user-renamed

`moduleDef.id` is a fixed, canonical name: `heading`, `paragraph`, `image`, `button`, `carousel`, `cta`, `testimonial`, `cta-box`, `accordion`, `icon-list`, `info-box`, `menu`, `social-icons`, `video`, `contact-form`, `breadcrumb`.

The user-facing instance name (what shows in the inspector and the structure tree) lives in `moduleInstance.displayLabel` and `moduleInstance.legacyConfig.__instanceName`. Renaming an instance MUST NOT change its canonical type. The renderer for `M-button` is the same regardless of whether you called the instance "Hero CTA" or "Buy now".

### 3.4 The runtime doesn't touch host DOM

The runtime provides overlays (region outlines, panel manager UI, inspector). It MUST NOT scrape or rewrite host DOM elements.

**Why:** if the runtime starts coupling to host DOM, it stops being reusable. Every consumer would need its own fork.

### 3.5 Save is idempotent

Every edit produces a `putModule` / `putRegion` call. Replaying the same edit produces the same DOM. This is what makes undo work — undo is just "replay the last N edits in reverse."

### 3.6 One panel system, not five

All overlays (region outlines, CMS panel, inspector panels, future breadcrumb) use the same PanelManager singleton. No parallel CSS overlay systems. The panel manager already handles drag, dock, slim-pill, multi-panel stacking, snap-to-edge. Don't reinvent it.

---

### 3.7 Panels are FES-managed or website-managed, never both

A panel has exactly one owner. Either the FES owns it, or the website owns it. The two never share an implementation.

- **FES-owned panels** ship with the package: Module widget (per §3.10), Navigator (per `app-fragments/editor-navigator/fragment.md`), Outline, Context menu, Breadcrumb, Renderer, Store, Panel Manager, canonical M-* modules.
- **Website-owned panels** ship with the website: Dev panel, CMS panel, Region panel, anything with site-specific UI.

A panel is created by exactly one place. A change to a panel's body is the responsibility of that panel's owner. The FES does not patch into a website's panel. The website does not patch into an FES-owned panel. A website that wants to override an FES-owned panel does so by NOT installing the FES panel and providing its own.

### 3.8 Chip-click opens or focuses the panel for that thing. Tabs inside a panel are a separate, host-app concern.

Click a region chip on the page → a region panel for that region opens in the dock (or focuses if already open). Click a module chip → a module panel for that module opens. Multiple module panels can be open simultaneously (one per selected module).

Selection is the only routing signal for which panel to open. The FES does not swap content inside an existing panel when a chip is clicked.

**Tabs inside any panel are an independent, host-app affordance.** The Dev panel may have tabs, the CMS panel has tabs, the Region panel may have tabs, the Module panel has tabs (Fields / Variants / Raw JSON per the FES editor-shell design). The pact does not define tab content. The pact only defines: chip click opens a separate panel, never swaps content inside an existing one.

### 3.9 Each area is a module. Hooks between modules are named and minimal.

Per FreshVibe Way V8 §10 ("Modules as Clusters"), the CMS is split into modules — clusters of features. Each module lives in its own folder under `app-fragments/`. Modules **only** talk to each other through **named, minimal hooks** declared in the module's `fragment.md`.

**The public hook surface for each module is its `index.js`**. The private implementation lives in `runtime.js`, css files, and test files. No module imports from another module's `runtime.js`. Cross-module imports go through the other module's `index.js`. Implementation details stay private.

If you want to swap the Navigator for a different one, you only change the Navigator folder. The other modules don't know the Navigator exists — they only know "there is a thing that gives me a tree, and clicking a row gives me a selection." That's the entire Navigator contract.

**If swapping one module for a different one requires changes in another module, the boundaries are wrong.** This is the modularity test.

### 3.10 A "widget" is the control surface of a module.

In Elementor, a widget is the editing panel that appears when you click a module on the page. In this CMS, the same word: the **widget** for `M-heading` is the form with text/level/color/align/font fields. The widget is the module's chips + behaviours rendered as the panel body.

- The **module** owns the data (canonical config) and the renderer.
- The **widget** owns the editing UI (chips + behaviours that show up in the panel).
- When you change a field in the widget, the module's renderer patches the live DOM in place (per §3.2).

**Tag colors** (operator-locked 2026-07-11):
- **Yellow** (`#ffdc64`) = CMS-level pills in the dock (Dev, CMS, any tool not tied to a thing on the page).
- **Brown** (`#a06a3a`) = Region tags on the page. Region tags float at the top-left of each region.
- **Purple** (`#a878e8`) = Widget sub-tags inside a region. Visible only when the region is selected.

Tags are visually independent. Tags of one type NEVER hide tags of another type. Every tag stays clickable regardless of what other tags are nearby. (No z-index war — each tag is in its own visual layer and clicks pass through correctly.)

**Drill-down navigation** (operator-locked 2026-07-11): in dev mode, top-level region tags are always visible. Click a region tag → its area on the page gets a brown highlight outline AND the widget sub-tags inside that region become visible. Other regions' widget sub-tags stay hidden. Click a widget sub-tag → open the widget panel for that widget. The operator navigates down a page by region, drills down to widgets.

## 4. What not to do

- Don't add features "for the operator's convenience" during a refactor. Refactor what exists; new features get their own commit with sign-off.
- Don't introduce a new panel system. The PanelManager singleton is the only overlay system.
- Don't wipe DOM with `innerHTML = ''`. Patch in place.
- Don't touch host DOM outside the editor's own overlays.
- Don't promote a single feature (e.g. "the rename button") to a top-level area. It's a chip; it's part of the editor's surface.

---

## 5. What we promise

If you put `<script type="module" src="bootstrap.js">` on an HTML page and provide an `annotation.json`, you get:
- Click any region → its inspector opens
- Click any module → its editor shell opens with the right fields
- The structure tree mirrors the live DOM (works with Elementor, Gutenberg, Webflow tokens)
- Edits apply in place, no reload, no SSR round-trip
- Undo is always available (20-entry capped stack)
- Plain HTML, Elementor, Gutenberg, Webflow all work — same code path

---

## 6. Anti-drift rules

These rules prevent the package from drifting away from what it claims to be. Every commit should obey them.

1. **Verify before you refactor.** For every change, prove the current state in a browser (curl, Playwright, manual check) BEFORE editing.
2. **Safe Diff Protocol.** Atomic commits. Commit messages say what diverged. Shadow versions of old code when you replace something risky.
3. **No invention.** Only refactor what exists. New features get their own commit with operator sign-off.
4. **Explicit binary verification.** Every change has a test — Playwright, vitest, curl-based, whatever proves the change works.
5. **DOM hierarchy verification.** The structure is preserved — heading stays a heading, section stays a section.
6. **Behaviour/state verification.** Same inputs produce same outputs. Edit → save → reload → DOM matches.
7. **Drift detection.** Every commit checks `git diff` and confirms the intent matches the diff.

---

## 7. What freshvibe-cms is NOT

To remove all doubt:
- **Not WordPress.** No post type admin UI. No admin user roles. No settings menu.
- **Not a CMS in the content-management sense.** It's the editing layer you'd put ON TOP of a CMS, not the CMS itself.
- **Not Elementor / Bricks / Divi.** We borrow patterns. We don't wholesale clone.
- **Not an SSR runtime.** The page is already rendered. FreshVibe CMS overlays it.
- **Not coupled to any framework.** Detectors per framework. Runtime agnostic.

---

## 8. Consumers

Apps that use freshvibe-cms today or might tomorrow:

| Consumer | Status | Notes |
|---|---|---|
| **Oscar-web** (`avidtech6/oscar-web`) | active | Elementor + EAEL detector glue. The host-specific stuff lives in Oscar-web, not here. |
| **FreshVibe Studio** | future | Stencil output. |
| **Plain HTML** | future | Any HTML page with an `annotation.json`. |
| **Shopify Liquid** | future | Liquid output. |
| **Webflow** | future | Webflow-detected sites. |

Each consumer can override any feature. If they only override a couple of files, they're "light users." If they mirror a chunk, they're "medium overrides." If they fork the whole thing, they're a "full fork." The thresholds (20% / 50%) come from the FreshVibe Way V8 doctrine.

---

## 9. How it boots

When the page loads, the editor comes up in this order:

```
HTML page loads
  → bootstrap.js runs
  → initCms() opens the IndexedDB store
  → loadAnnotation(annotation) seeds pages / regions / modules
  → ensureDefaultAdapters() registers DOM-config adapters
  → populateAll(store) reads live DOM and fills in legacyConfig for each module
  → connect() binds each module to its DOM element (.elementor-element-{id} etc.)
  → subscribeToStore() makes any putModule() trigger a re-render
  → showRegionOverlays() spawns one panel per region with a yellow tag
```

After that, the page is editable. Click → inspector opens → edit → save → DOM patches in place.

---

## 10. Where to look next

- `invariants.md` — the formal rule list (extends §3 above)
- `app-fragments/fragments.md` — every feature in the package, indexed
- `stubs/` — explicit placeholders for features that don't exist yet
- `README.md` — package entry point
- `docs/module-authoring.md` — how to write a new layout module
- `docs/ai-integration.md` — how AI integrates (Phase 4.3 forward)