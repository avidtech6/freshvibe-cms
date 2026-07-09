---
id: fvcms.pact.invariants.001
freshvibe_way_version: v8
date: 2026-07-09
---

# FreshVibe CMS — Invariants

Formal list of properties the subsystem MUST always satisfy. These are derived from `app-pact.md §3` but stated explicitly so they can be tested automatically.

---

## I-001 — Two-tier architecture — generic core + framework-aware renderers

The runtime has **two layers**:

**Layer A — Generic core** (must be framework-agnostic):
- `runtime/store.js`, `runtime/scope.js`, `runtime/load-annotation.js`, `runtime/config-from-dom.js`, `runtime/default-config-adapters.js`, `runtime/region-renderer.js`, `runtime/region-editor.js`, `runtime/skin.js`, `runtime/panel-manager/*`, `bootstrap.js`
- **MUST NOT** contain the words `Elementor`, `WordPress`, `Gutenberg`, `Bricks`, `Webflow`, `Beaver`, `WPBakery`, `Divi`.
- **Why:** the engine must work in any HTML site.

**Layer B — Framework-aware renderers** (allowed to probe for framework classes as fallbacks):
- `runtime/renderer.js` contains both generic renderers (heading, image, paragraph, cta, menu, accordion, social-icons, icon-list, info-box, video, contact-form, breadcrumb) and a small number of **framework-aware** renderers (currently `M-button`, `M-testimonial`).
- Framework-aware renderers probe for Elementor/EAEL class names as **fallback selectors**, listed AFTER the generic `a` / `p` / `button` selector. They MUST fall back gracefully: if no framework class is found, the renderer still works on plain HTML.
- **Why:** Oscar-web has Elementor + EAEL. The hybrid approach lets Oscar-web consume freshvibe-cms as-is without shipping its own renderer fork.

**Migration target** (parked, NOT committed):
- Move framework-aware selectors into `runtime/renderer-adapters/` (a plugin folder).
- `runtime/renderer.js` becomes fully generic.
- Each consumer app (Oscar-web, Shopify, etc.) ships its own renderer-adapter plugin.
- Tracked as `stubs/renderer-adapters.md`.

**Test for Layer A (selector logic, not comments):**
```bash
# 1. No querySelector / querySelectorAll with framework classes
! grep -rE "querySelector\(.*['\"](elementor-|wp-block-|eael-|fl-builder|divi-)" \
    runtime/store.js runtime/scope.js runtime/load-annotation.js \
    runtime/config-from-dom.js runtime/default-config-adapters.js \
    runtime/region-renderer.js runtime/region-editor.js runtime/skin.js \
    runtime/panel-manager/ bootstrap.js modules/

# 2. No classList.add/remove/toggle with framework classes
! grep -rE "classList\.(add|remove|toggle)\(['\"](elementor-|wp-block-|eael-|fl-builder|divi-)" \
    runtime/store.js runtime/scope.js runtime/load-annotation.js \
    runtime/config-from-dom.js runtime/default-config-adapters.js \
    runtime/region-renderer.js runtime/region-editor.js runtime/skin.js \
    runtime/panel-manager/ bootstrap.js modules/
```

**Exception — comments are allowed:**
- Module files (`modules/<type>.js`) MAY have a header comment explaining what FvRE-detected source type the canonical id aliases. E.g. `modules/button.js` documents that `M-button` aliases EAEL creative button and Elementor button widgets.
- `runtime/load-annotation.js` MAY mention `detectElementor()` in comments to explain the alternative path.
- These are **provenance documentation**, not runtime logic. They describe why a canonical id exists, not how the runtime behaves.
- **Test for comments:** the violation above shows ONLY `//` lines, never selectors or classList calls.

**Status:** ✅ verified manually 2026-07-09. Layer A has zero selector logic for frameworks. Layer B has explicit fallback selectors with graceful degradation.

**Test for Layer B fallback:**
A plain-HTML page (`<div data-fvcms-module="M-button"><a href="/x">Hello</a></div>`) MUST be editable. No Elementor class needed.

**Status:** ✅ verified manually 2026-07-09. Layer A is framework-free. Layer B has explicit fallback selectors.

---

## I-002 — Renderers are non-destructive

**Statement:** No code path in `runtime/renderer.js` calls `innerHTML = ''` or `outerHTML = ...` on a module's host element to re-render from scratch. Renderers patch DOM in place.

**Test:**
```bash
! grep -rE 'innerHTML\s*=\s*[\x27\x22]\s*[\x27\x22]' runtime/renderer.js
```

**Why:** host framework CSS classes (EAEL, Elementor, Gutenberg block CSS) must survive the edit.

**Status:** ✅ verified at commit `7f0b454` — non-destructive renderers landed.

---

## I-003 — Module canonical id is bare name

**Statement:** `moduleDef.id` is canonical: `heading`, `paragraph`, `image`, `button`, `carousel`, `cta`, `testimonial`, `cta-box`, `accordion`, `icon-list`, `info-box`, `menu`, `social-icons`, `video`, `contact-form`, `breadcrumb`.

`getModuleDef(id)` matches: `id`, `'M-' + id`, `id` (bare).

**Test:**
```js
import { getModuleDef } from './runtime/index.js';
getModuleDef('heading');      // → M-heading
getModuleDef('M-heading');    // → M-heading
getModuleDef('M-heading-default'); // → M-heading-default (per-instance names map to base type)
```

**Why:** renderer registry uses bare id; some imports use `M-` prefix; consumers use bare id. Both must work.

**Status:** ✅ verified at commit `7f0b454` — `runtime/index.js` and `modules/index.js` both have the bare-prefix match.

---

## I-004 — Renderers register under both bare id and M-prefix

**Statement:** When a renderer is registered, it is reachable via both `RENDERERS[name]` and `RENDERERS['M-' + name]`.

**Test:**
```js
import { getModuleDef } from './runtime/index.js';
import { renderModule, subscribeToStore } from './runtime/renderer.js';
const def = getModuleDef('heading'); // → M-heading
renderModule('m-001');               // → uses RENDERERS['heading'] || RENDERERS['M-heading']
```

**Why:** `registerRenderer('M-heading', fn)` would otherwise leave `RENDERERS['heading']` undefined. Bug fixed at commit `be0b8a1`.

**Status:** ✅ verified at commit `7f0b454`.

---

## I-005 — Populate runs AFTER module-DOM binding

**Statement:** `populateAll(store)` runs AFTER `connectModule(m, el)` for every module. Never before.

**Test:** `bootstrap.js` order:
```
connect(module)        ← m.el is set
populateAll(store)     ← adapter reads m.el and extracts DOM config
subscribeToStore()     ← now putModule() will re-render with populated config
```

**Why:** if populate runs first, `m.el` is null and the adapter sees nothing. Bug fixed at commit `1704c0e`.

**Status:** ✅ verified at commit `7f0b454`.

---

## I-006 — Panel manager is the single overlay system

**Statement:** All overlays (region outlines, CMS panel, inspector panels, breadcrumb) use the PanelManager singleton (`window.PanelManager || window.OscarPanelManager`). No parallel CSS overlay system may exist.

**Test:**
```bash
! grep -rE 'position:\s*fixed.*z-index:\s*999' runtime/ \
   | grep -v panel-manager
```

**Why:** one drag/dock/slim-pill behaviour. Five CSS systems would conflict.

**Status:** ✅ verified — runtime/visualizer.js calls PanelManager API.

---

## I-007 — Save round-trip is idempotent

**Statement:** Calling `putModule(m)` twice with the same payload produces the same DOM state.

**Test:** Playwright. Edit a heading → save → DOM text matches. Reload page → DOM text matches.

**Why:** undo is "replay last N round-trips in reverse." If round-trip isn't idempotent, undo corrupts state.

**Status:** ✅ verified at commit `7f0b454` — undo stack (20 entries) works in browser.

---

## I-008 — Structure tree mirrors live DOM

**Statement:** The structure tree shows real DOM elements that match any of:
- Elementor tokens: `elementor-element-{id}`
- Gutenberg tokens: `wp-block-{name}`
- Webflow tokens: `w-{hex8+}` (operator-confirmed)
- Direct module-instance binding: `m.el === treeNode`

**Test:** `runtime/cms-panel.js` structure walker. Click a tree node → page scrolls to that element.

**Why:** the structure tree is navigation, not an abstract model. It must match what the user sees.

**Status:** ✅ verified at commit `fd3f3d0` (freshvibe-cms + oscar-web).

---

## I-009 — Consumer app owns host-specific glue

**Statement:** Elementor class detection, EAEL widget class aliasing, post-grid region merging, etc. live in the **consumer app** (e.g. Oscar-web), NOT in freshvibe-cms. freshvibe-cms exposes generic adapters that consumers use.

**Test:** `runtime/detectors/elementor.js` exports a generic `detect({ pathname, html })` function. Oscar-web calls it with Elementor-specific selectors. No EAEL references in freshvibe-cms.

**Why:** if EAEL references lived in freshvibe-cms, Bricks-Webflow-Shopify consumers would pull in dead code.

**Status:** ✅ verified — only `detectors/elementor.js` exists; no `detectors/eael.js`, `detectors/bricks.js`, etc.

---

## I-010 — Instance rename preserves canonical type

**Statement:** `moduleInstance.displayLabel` and `moduleInstance.legacyConfig.__instanceName` may change freely. `moduleInstance.moduleId` MUST NOT change. `getModuleDef(moduleInstance.moduleId)` returns the same def before and after rename.

**Test:**
```js
const m = store.getModule('m-001');
const defBefore = getModuleDef(m.moduleId);
m.displayLabel = 'My Hero Heading';
store.putModule(m);
const defAfter = getModuleDef(m.moduleId);
defBefore === defAfter; // → true
```

**Why:** rename is a label, not a type change. Changing the type would break the renderer.

**Status:** ✅ verified in Oscar-web test (commit `fragments-079-tabs-structure`).

---

## Cross-references

- `app-pact.md` — the master pact document
- `app-fragments/fragments.md` — the fragment index
- `stubs/` — explicit placeholders for content-types, queries, templates
- `runtime/` — the engine
- `modules/` — the canonical layouts
- `detectors/` — the framework-specific adapters