---
id: fvcms.pact.invariants.001
freshvibe_way_version: v8
date: 2026-07-09
last_rewritten: 2026-07-10 (plain-language pass per operator)
---

# FreshVibe CMS — testable invariants

These are the rules from `app-pact.md` written so they can be tested automatically. Each rule has a name, a statement, a test, and a "why."

If a test fails, the change that broke it is wrong. Revert or fix.

---

## I-001 — The engine doesn't depend on any specific page builder

**Statement:** A grep for selector or classList calls using framework-specific CSS classes (`elementor-`, `wp-block-`, `eael-`, `fl-builder`, `divi-`) in the generic engine returns zero matches.

Comments documenting *why* a canonical module exists are allowed (e.g. `// M-button aliases EAEL creative buttons`). They document provenance, not runtime behaviour.

**Test (Layer A — generic engine):**
```bash
# 1. No querySelector with framework classes
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

**Layer B — framework-aware renderers** (`runtime/renderer.js`) currently contain fallback selectors for `M-button` and `M-testimonial`. They MUST fall back gracefully — plain HTML must still work. The migration target is to move Layer B into `runtime/renderer-adapters/` (a plugin folder) when a second consumer arrives. Until then, the hybrid approach is the simplest thing that works.

**Why:** the engine must work in any HTML site. If Layer A leaked framework names into selectors, every consumer would inherit dead code.

**Status:** ✅ verified manually 2026-07-09. Layer A has zero selector logic for frameworks. Layer B has explicit fallback selectors with graceful degradation.

---

## I-002 — Renderers patch in place, never replace

**Statement:** No code path in `runtime/renderer.js` calls `innerHTML = ''` or `outerHTML = ...` to re-render a host element from scratch. Renderers patch DOM in place.

**Test:**
```bash
! grep -rE 'innerHTML\s*=\s*[\x27\x22]\s*[\x27\x22]' runtime/renderer.js
```

**Why:** host framework CSS classes (EAEL creative-button styling, Elementor heading typography, Gutenberg block CSS) must survive the edit. The visual identity of the page is preserved.

**Status:** ✅ verified at commit `7f0b454` — non-destructive renderers landed.

---

## I-003 — Canonical layout id matches by bare name or M-prefix

**Statement:** `moduleDef.id` is canonical: `heading`, `paragraph`, `image`, `button`, `carousel`, `cta`, `testimonial`, `cta-box`, `accordion`, `icon-list`, `info-box`, `menu`, `social-icons`, `video`, `contact-form`, `breadcrumb`.

`getModuleDef(id)` matches: `id`, `'M-' + id`, or `id` as bare. So `getModuleDef('heading')`, `getModuleDef('M-heading')`, and `getModuleDef('heading.default')` all return the right definition.

**Test:**
```js
import { getModuleDef } from './runtime/index.js';
getModuleDef('heading');             // → M-heading
getModuleDef('M-heading');           // → M-heading
getModuleDef('heading.default');     // → M-heading (per-instance names map to base type)
```

**Why:** the renderer registry uses bare id; some imports use `M-` prefix; consumers use bare id. All three styles must work.

**Status:** ✅ verified at commit `7f0b454`. `runtime/index.js` and `modules/index.js` both have the bare-prefix match.

---

## I-004 — Renderers register under both bare id and M-prefix

**Statement:** When a renderer is registered, it is reachable via both `RENDERERS[name]` and `RENDERERS['M-' + name]`.

**Test:**
```js
import { renderModule } from './runtime/renderer.js';
renderModule('m-001');                // uses RENDERERS['heading'] || RENDERERS['M-heading']
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

## I-006 — One panel system, not five

**Statement:** All overlays (region outlines, CMS panel, inspector panels, breadcrumb, context menu) use the same PanelManager singleton (`window.PanelManager || window.OscarPanelManager`). No parallel CSS overlay systems may exist.

**Test:**
```bash
! grep -rE 'position:\s*fixed.*z-index:\s*999' runtime/ \
   | grep -v panel-manager
```

**Why:** one drag/dock/slim-pill behaviour. Five competing CSS systems would conflict.

**Status:** ✅ verified — runtime/visualizer.js calls the PanelManager API. No parallel systems.

---

## I-007 — Save is idempotent

**Statement:** Calling `putModule(m)` twice with the same payload produces the same DOM state.

**Test:** Playwright. Edit a heading → save → DOM text matches. Reload the page → DOM text matches. Edit again → save → still matches.

**Why:** undo is "replay last N edits in reverse." If save isn't idempotent, undo corrupts state.

**Status:** ✅ verified at commit `7f0b454` — undo stack (20 entries) works in browser.

---

## I-008 — Structure tree mirrors the live DOM

**Statement:** The structure tree shows real DOM elements that match any of:
- Elementor tokens: `elementor-element-{id}`
- Gutenberg tokens: `wp-block-{name}`
- Webflow tokens: `w-{hex8+}` (operator-confirmed)
- Direct module-instance binding: `m.el === treeNode`

**Test:** Click a tree node → page scrolls to that element.

**Why:** the structure tree is navigation, not an abstract model. It must match what the user sees.

**Status:** ✅ verified at commit `fd3f3d0` (freshvibe-cms + oscar-web).

---

## I-009 — The consumer owns host-specific glue

**Statement:** Elementor class detection, EAEL widget class aliasing, post-grid region merging, etc. live in the **consumer app** (e.g. Oscar-web), NOT in freshvibe-cms. freshvibe-cms exposes generic adapters that consumers use.

**Test:** `runtime/detectors/elementor.js` exports a generic `detect({ pathname, html })` function. Oscar-web calls it with Elementor-specific selectors. No EAEL references in freshvibe-cms runtime/.

**Why:** if EAEL references lived in freshvibe-cms, Bricks/Webflow/Shopify consumers would pull in dead code.

**Status:** ✅ verified — only `detectors/elementor.js` exists; no `detectors/eael.js`, `detectors/bricks.js`, etc.

---

## I-010 — Instance rename preserves the canonical type

**Statement:** `moduleInstance.displayLabel` and `moduleInstance.legacyConfig.__instanceName` may change freely. `moduleInstance.moduleId` MUST NOT change. `getModuleDef(moduleInstance.moduleId)` returns the same definition before and after rename.

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

## I-011 — Panels are FES-managed or website-managed, never both

**Statement:** Every panel has exactly one owner. Either the FES owns it, or the website owns it. A panel is created by exactly one place. The FES does not patch into a website's panel. The website does not patch into an FES-owned panel.

**Test:**
```bash
# FES-owned panels live in freshvibe-cms runtime/ or app-fragments/
# Website-owned panels live in the consumers app-fragments/
# Cross-ownership patching is forbidden
```

**Why:** two systems writing to the same panel is the bug. The bridge file in the legacy oscar-web code was this bug. Result: tab clicks did not work. The rule prevents that pattern.

**Status:** new 2026-07-11 as part of plan v5 rewrite.

---

## I-012 — Chip-click opens or focuses the panel for that thing

**Statement:** Click a region chip on the page opens a region panel for that region in the dock (or focuses if already open). Click a module chip opens a module panel for that module. Multiple module panels can be open simultaneously (one per selected module). The FES does not swap content inside an existing panel when a chip is clicked.

**Test:** Playwright. Click a region chip, assert one region panel exists in the dock for that region. Click a different region chip, assert a second region panel exists (not the first ones content swapped). Click a module chip on a region, assert a module panel exists for that module. Click the same module chip again, assert no new panel is created, the existing one is focused.

**Why:** the operators mental model is one click = one panel. Two clicks on two different things swapping content in the same panel makes the operator lose track of what is open. One panel per clicked thing is clearer.

**Status:** new 2026-07-11.

---

## I-013 — Modular boundaries: a modules public API is its `index.js`

**Statement:** Each module under `app-fragments/` exposes its public API in its `index.js`. No other module imports from that modules `runtime.js`, css, or test files. Cross-module imports go through the other modules `index.js`. If swapping one module for a different one requires changes in another module, the boundaries are wrong.

**Test:**
```bash
# No cross-module runtime.js imports
! grep -rE 'from .*editor-[a-z]+/runtime\.js' app-fragments/
```

**Why:** the modularity rule. Cross-module coupling at the runtime.js level creates the kind of mess we just cleaned up.

**Status:** new 2026-07-11.

---

## I-014 — A widget is the control surface of a module

**Statement:** A widget is the chips + behaviours that appear as the panel body when a module is selected. The module owns the data (canonical config) and the renderer. The widget owns the editing UI. Changing a field in the widget causes the modules renderer to patch the live DOM in place (per I-002).

**Test:** for each canonical module (M-heading, M-button, etc.), verify there is a widget file that exports a render function which takes a module instance and returns the editing UI. Verify that changing a field in that UI calls `renderModule(moduleId)` to patch the live DOM.

**Why:** Elementors vocabulary. The operator expects "widget" to mean "the editing panel for a module."

**Status:** new 2026-07-11.

---

## I-015 — Tag colors are locked

**Statement:**
- Yellow `#ffdc64` = CMS-level pills in the dock (Dev, CMS, any tool not tied to a thing on the page).
- Brown `#a06a3a` = Region tags on the page. Region tags float at the top-left of each region.
- Purple `#a878e8` = Widget sub-tags inside a region. Visible only when the region is selected.

Tags are visually independent. Tags of one type NEVER hide tags of another type.

**Test:**
```bash
# Region tag color
grep -E 'a06a3a' app-fragments/editor-outline/*.css
# Widget tag color
grep -E 'a878e8' app-fragments/editor-outline/*.css
# Dock pill color
grep -E 'ffdc64' runtime/panel-manager/*.css
```

**Status:** new 2026-07-11.

---

## I-016 — Drill-down navigation

**Statement:** In dev mode, top-level region tags are always visible. Click a region tag, its area on the page gets a brown highlight outline AND the widget sub-tags inside that region become visible. Other regions widget sub-tags stay hidden. Click a widget sub-tag, open the widget panel for that widget.

**Test:** Playwright. Enter dev mode, assert at least one region tag is visible. Click a region tag, assert that regions area has a brown highlight class, and the widget sub-tags inside that region are visible, and the widget sub-tags of other regions are hidden.

**Status:** new 2026-07-11.

---

## Where to look

- `app-pact.md` — the rules in prose form
- `app-fragments/fragments.md` — every feature, indexed
- `stubs/` — explicit placeholders for features that don't exist yet