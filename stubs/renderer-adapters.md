---
id: fvcms.stub.renderer-adapters.001
status: STUB
freshvibe_way_version: v8
date: 2026-07-09
---

# STUB: Renderer Adapters

> **This is a STUB.** It documents a refactor that's **intentionally parked**. The current `runtime/renderer.js` has framework-aware fallback selectors inside two renderers (`M-button`, `M-testimonial`). The parked refactor moves those selectors out into a pluggable adapter folder.

---

## Why it's parked (not done)

The current hybrid approach works. Oscar-web runs end-to-end with `M-button` finding EAEL's `.eael-creative-button` classes and `M-testimonial` finding `.eael-testimonial-*`. No migration urgency.

But V8 §3.1 says the generic core should be framework-agnostic. The hybrid approach is a **pragmatic compromise**, not the long-term shape.

## What this refactor WILL do when unblocked

1. Move framework-aware selectors from `runtime/renderer.js` into `runtime/renderer-adapters/elementor-eael.js`.
2. Make `runtime/renderer.js` fully generic.
3. Define `registerRendererAdapter(framework, renderType, adapterFn)` API.
4. Update `bootstrap.js` to call `registerDefaultRendererAdapters()` which loads adapters based on which frameworks are detected on the page.
5. Update Oscar-web to ship its own `elementor-eael` adapter (or import the default).
6. The runtime becomes truly framework-agnostic.

## What changes for the operator

- **Before:** Oscar-web loads `freshvibe-cms` and gets hybrid renderers.
- **After:** Oscar-web loads `freshvibe-cms` AND `freshvibe-cms/renderer-adapters/elementor-eael`. Cleaner separation, but more imports.

## When to unblock

When a second consumer app arrives that needs different framework support (e.g. a Bricks consumer). Then the abstraction pays for itself.

For now, with one consumer (Oscar-web), the hybrid approach is simpler. Per anti-drift rule 3: don't refactor what's not breaking.

## Open questions for the operator

1. Confirm: keep the hybrid approach until a second consumer justifies the refactor?
2. Or: refactor now anyway, since the abstraction is conceptually cleaner?

## Cross-references

- `app-pact.md §3.1` — the two-tier architecture
- `invariants.md §I-001` — the formal invariant + migration target
- `app-fragments/fragments.md §Module 2` — the runtime fragment index