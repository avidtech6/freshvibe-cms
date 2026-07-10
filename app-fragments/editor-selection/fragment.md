id: fragment.editor-selection.001
freshvibe_way_version: v8
date: 2026-07-09
last_rewritten: 2026-07-10 (plain-language pass per operator)

# editor-selection — central selection state

## What it does

The single source of truth for "what is currently selected" in the frontend editor. It tracks whether the user is focused on a region, a module, or nothing — plus the ID of the focused item.

Other features (outline, inspector, navigator, breadcrumb, context-menu) read from and write to this state. Without it, each feature would have to track selection on its own and they'd drift out of sync.

## Why this is its own feature

Selection isn't a single action — it's a cluster of related capabilities:

1. **Get current selection** — fast read for outline and breadcrumb to highlight
2. **Set selection** — from outline click, navigator click, breadcrumb click
3. **Subscribe to changes** — outline highlights, inspector reloads, breadcrumb redraws
4. **History (undo selection)** — back-button through recent selections
5. **Multi-kind selection** — region, module, page (future: group)

Removing any one of these would break the editor's value. That's why selection is one feature, not five.

## Inputs

- `select({ kind, id })` — `kind` is `'region'`, `'module'`, `'page'`, or `null`. `id` is the focused item's ID.
- `get()` — no inputs
- `onChange(fn)` — `fn` is a callback that receives `(current, previous)`
- `withSelection(fn)` — `fn` runs once with the current selection
- `undo()` — no inputs; pops the history
- `clear()` — no inputs; sets current to `null`

## Outputs

- `window.FreshVibeCmsSelection` — the singleton
- DOM event `fvcms:selection-change` (bubbles, detail includes `current` and `previous`)
- Side-effect: `data-fvcms-selected-kind` and `data-fvcms-selected-id` attributes on `<body>`, for CSS hooks

## What depends on it

- **Writes to it:** `runtime/editor-shell.js` (when user opens a module editor), `runtime/visualizer.js` (when user clicks a region tag), `runtime/cms-panel.js` (navigator click), future `runtime/breadcrumb.js` (path click), future `runtime/context-menu.js` (action target)
- **Reads from it:** `runtime/cms-panel.js` (Inspector tab), `runtime/visualizer.js` (outline highlight), future `runtime/breadcrumb.js`, future `runtime/context-menu.js`

## The rules (invariants)

1. **`current` is always either `null` or `{ kind, id }`** where `kind` is non-null and `id` is a string. Never a half-state.
2. **Listeners fire synchronously** — by the time `select()` returns, all `onChange` callbacks have run. No async.
3. **DOM hook mirrors state** — `document.body.dataset.fvcmsSelectedKind` and `dataset.fvcmsSelectedId` are always in sync with `current`.
4. **History is capped at 20** (matches the undo-stack capacity).
5. **Setting the same value twice is a no-op** — listeners don't fire, history doesn't grow. Prevents feedback loops.
6. **No framework names** — selection is framework-agnostic. It just tracks IDs.
7. **`undo()` doesn't cross kinds** — popping a `module` selection from history returns to whatever was selected before (could be `region` or `null`).

## Public API

```
FreshVibeCmsSelection.get()                     → { kind, id } | null
FreshVibeCmsSelection.select({ kind, id })      → void
FreshVibeCmsSelection.clear()                   → void
FreshVibeCmsSelection.undo()                    → void  (pops history)
FreshVibeCmsSelection.onChange(fn)              → unsubscribe
FreshVibeCmsSelection.withSelection(fn)         → T
FreshVibeCmsSelection.state                     → { current, history, listeners }
```

## CSS hooks

These data attributes on `<body>` let CSS style the outline, breadcrumb, and navigator entries without needing JavaScript for visual state:

- `[data-fvcms-selected-kind="region"]` — region selected
- `[data-fvcms-selected-kind="module"]` — module selected
- `[data-fvcms-selected-kind="page"]` — page selected
- `[data-fvcms-selected-kind=""]` (or absent) — nothing selected

## Migration path

Today, selection is implicit:

- `oscar-cms-panel.js` tracks `selectedModuleId` locally
- `PanelManager` tracks the active panel
- `visualizer.js` highlights a region by panel focus

After this feature ships, consumers migrate to `FreshVibeCmsSelection` in their own commits:

- `oscar-cms-panel.js` reads selection from the singleton instead of local state
- `visualizer.js` reads selection to highlight region outlines
- Future `breadcrumb.js` reflects the selection path
- Future `context-menu.js` acts on the selection

Migration is per-consumer, not required for this feature to land.

## Where to look

- `app-pact.md §3.4` — runtime doesn't touch host DOM (selection respects this — DOM hooks are minimal)
- `app-pact.md §3.6` — Panel manager owns all overlays (selection doesn't replace PanelManager, it lives alongside)
- `app-fragments/fragments.md §Area 1` — feature index entry
- `invariants.md I-009` — consumer owns host-specific glue (selection is host-agnostic)