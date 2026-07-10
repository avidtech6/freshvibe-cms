id: fragment.editor-selection.001
freshvibe_way_version: v8
date: 2026-07-09

# editor-selection — central selection state

## Purpose

Single source of truth for "what is currently selected" in the frontend
editor. Tracks whether the user is focused on a region, a module, or
nothing, plus the ID of the focused item. Other fragments (outline,
inspector, navigator, breadcrumb, context-menu) read from and write to
this state.

## Why this is a fragment, not a chip

Selection is a **behaviour cluster** per V8 §10.1. It contains:

1. **Get current selection** — fast read for outline + breadcrumb to highlight
2. **Set selection** — from outline click, navigator click, breadcrumb click
3. **Subscribe to changes** — outline highlights, inspector reloads, breadcrumb redraws
4. **History (undo selection)** — back-button through recent selections
5. **Multi-kind selection** — region, module, page (future: group)

Removing any one of these would break the editor's value. Cluster rule
holds: selection is a fragment, not a chip.

## Inputs

- `select({ kind, id })` — `kind` ∈ `{'region', 'module', 'page', null}`, `id` ∈ string
- `get()` — no inputs
- `onChange(fn)` — `fn` ∈ `(state, prevState) => void`
- `withSelection(fn)` — `fn` ∈ `(state) => T`, returns `T`
- `undo()` — no inputs; pops history
- `clear()` — no inputs; sets current to `{ kind: null, id: null }`

## Outputs

- `window.FreshVibeCmsSelection` — the singleton
- DOM event `fvcms:selection-change` (bubbles, detail = `{ current, previous }`)
- Side-effect: `data-fvcms-selected-kind` + `data-fvcms-selected-id` on `<body>` for CSS hooks

## Dependencies

- **Reads:** none (no upstream)
- **Written by:** `runtime/editor-shell.js` (when user opens a module editor), `runtime/visualizer.js` (when user clicks a region tag), `runtime/cms-panel.js` (navigator click), future `runtime/breadcrumb.js` (path click), future `runtime/context-menu.js` (action target)
- **Read by:** `runtime/cms-panel.js` (Inspector tab), `runtime/visualizer.js` (outline highlight), future `runtime/breadcrumb.js`, future `runtime/context-menu.js`

## Invariants

1. **`current` is always either `null` or `{ kind, id }` where `kind` is non-null and `id` is a string.** Never a half-state.
2. **Listeners fire synchronously** — by the time `select()` returns, all `onChange` callbacks have run. No async.
3. **DOM hook mirrors state** — `document.body.dataset.fvcmsSelectedKind` and `dataset.fvcmsSelectedId` are always in sync with `current`.
4. **History is capped at 20** (matches `fragment.undo-stack` capacity).
5. **Setting the same value twice is a no-op** — listeners don't fire, history doesn't grow. Prevents feedback loops.
6. **No framework names** — selection is framework-agnostic. It just tracks IDs.
7. **`undo()` does not cross kinds** — popping a `module` selection from history returns to whatever was selected before the module (could be `region` or `null`).

## Public API (window.FreshVibeCmsSelection)

```
FreshVibeCmsSelection.get()                     → { kind, id } | null
FreshVibeCmsSelection.select({ kind, id })      → void
FreshVibeCmsSelection.clear()                   → void
FreshVibeCmsSelection.undo()                    → void  (pops history)
FreshVibeCmsSelection.onChange(fn)              → unsubscribe
FreshVibeCmsSelection.withSelection(fn)         → T
FreshVibeCmsSelection.state                     → { current, history, listeners }
```

## DOM hooks (CSS selectors)

- `[data-fvcms-selected-kind="region"]` — body when region selected
- `[data-fvcms-selected-kind="module"]` — body when module selected
- `[data-fvcms-selected-kind="page"]` — body when page selected
- `[data-fvcms-selected-kind=""]` — body when nothing selected

These let CSS style the outline / breadcrumb / navigator entries without
needing JS for visual state.

## Migration path

Today, selection is implicit:

- `oscar-cms-panel.js` tracks `selectedModuleId` locally
- `PanelManager` tracks active panel
- `visualizer.js` highlights region by panel focus

After this fragment lands, consumers migrate to `FreshVibeCmsSelection`
in their own commits:

- `oscar-cms-panel.js` reads selection from the singleton instead of local state
- `visualizer.js` reads selection to highlight region outlines
- future `breadcrumb.js` reflects selection
- future `context-menu.js` acts on selection

Migration is per-consumer, not required for this fragment to land.

## Cross-references

- `app-pact/app-pact.md §3.4` — runtime never touches DOM outside overlays (selection respects this — DOM hooks are minimal)
- `app-pact/app-pact.md §3.6` — Panel manager owns all overlays (selection doesn't replace PanelManager, it lives alongside)
- `app-fragments/fragments.md §Module 1` — fragment index entry
- `invariants.md I-009` — consumer app owns host-specific glue (selection is host-agnostic)