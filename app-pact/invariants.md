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

## Where to look

- `app-pact.md` — the rules in prose form
- `app-fragments/fragments.md` — every feature, indexed
- `stubs/` — explicit placeholders for features that don't exist yet