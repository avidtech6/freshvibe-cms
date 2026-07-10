id: fragment.editor-navigator.001
freshvibe_way_version: v8
date: 2026-07-10

# editor-navigator — structure tree of the page

## What it does

Renders a tree view of every editable element on the page. Sections and containers nest; widgets sit inside their containers. Click any tree node to select it; drag any node to reorder its siblings in the live page.

This is the Elementor-style Navigator. It mirrors the live DOM — what you see in the tree IS what's on the page, not an abstract model.

## Why this is its own feature

The Navigator is a cluster of related capabilities:

1. **Walk the live DOM** — find every element with a recognised framework class token (Elementor, Gutenberg, Webflow)
2. **Build a nested tree** — top-level sections, their containers, their widgets
3. **Render with icons + labels** — type pill (H, P, I, B…) + a human label from the element's content
4. **Click to select** — sets the shared selection state
5. **Drag to reorder** — uses native HTML5 drag-and-drop, mutates the live DOM via insertBefore
6. **Expand/collapse** — per-node state, persisted across re-renders
7. **Live updates** — when the page changes (new section added, etc.), the tree refreshes

Removing any one of these breaks the operator's ability to navigate. Cluster rule holds.

## Inputs

- `buildNavigator()` — returns a DOM tree element ready to be inserted into a panel
- `refreshNavigator()` — re-walks the DOM, rebuilds the tree (called when data changes)
- Selection is read from `window.FreshVibeCmsSelection`. Click handlers route through selection.
- Drag-drop uses native HTML5 drag events; no third-party library.

## Outputs

- A DOM tree where each node is a `<div class="fvcms-tree-node">` containing:
  - A chevron (▾/▸) for expand/collapse
  - An icon representing the type
  - A type pill (uppercase, abbreviated)
  - A human-readable label
  - Children wrapped in `<div class="fvcms-tree-children">`
- Click handlers that route through `FreshVibeCmsSelection.select()`
- Drag handlers that mutate the live DOM via `insertBefore`
- Persisted expand/collapse state per node (via `data-oscar-tree-collapsed`)

## What depends on it

- **`runtime/cms-panel.js`** renders the Navigator inside the "Structure" tab of the dock panel.
- **Outline feature** (`runtime/outline.js`) reads the tree to know what's selectable.
- **Inspector feature** (future commit) reads selection to populate fields.

## The rules (invariants)

1. **Tree mirrors the live DOM** — if you add a section in DevTools, `refreshNavigator()` shows it.
2. **Click routes through selection** — never directly mutates store state.
3. **Drag mutates the live DOM** — uses `parentNode.insertBefore()`, not innerHTML or clone-and-replace.
4. **No framework names in selector logic** — class patterns are documented (Elementor, Gutenberg, Webflow tokens) but the walker is generic; any class matching the patterns works.
5. **Empty state is graceful** — "No editable elements found on this page." instead of an empty box.
6. **Expand/collapse state survives re-renders** — stored on the DOM node itself.
7. **Drag source != drag target** — same-node drops are no-ops.

## Public API

```
buildNavigator()            → HTMLElement  (the tree, ready to insert)
refreshNavigator()          → void          (rebuilds and replaces existing tree in-place)
```

## CSS hooks

- `.fvcms-tree-node` — tree node container
- `.fvcms-tree-node .row` — the clickable row
- `.fvcms-tree-node .row.is-current` — currently inspected (yellow tint)
- `.fvcms-tree-children` — child container (display: none when collapsed)
- `.fvcms-tree-node .icon` — type icon
- `.fvcms-tree-node .pill` — type pill
- `.fvcms-tree-node .label` — human label

## Migration path

Today, the Navigator lives in Oscar-web's `app-fragments/oscar-cms-panel/oscar-cms-panel.js` (~250 lines: `buildStructureContent`, `buildTreeNode`, `getIconForType`, drag handlers). After this feature ships, Oscar-web's version is replaced by an import from `runtime/navigator.js`. Oscar-web-specific label derivation can stay in Oscar-web as an override.

## Where to look

- `app-fragments/fragments.md §Area 1` — feature index entry
- `runtime/visualizer.js` — calls `refreshNavigator()` when overlays show/hide
- `runtime/outline.js` — sibling feature, reads same DOM
- `app-fragments/editor-selection/fragment.md` — selection state this writes to