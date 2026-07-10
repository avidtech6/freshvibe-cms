id: fragment.editor-context-menu.001
freshvibe_way_version: v8
date: 2026-07-10

# editor-context-menu — right-click menu for regions and modules

## What it does

Right-click on a region or module anywhere on the page (or in the navigator tree) and a floating menu appears next to the cursor with actions:

- **Edit** — opens the inspector for this module (kind: 'module')
- **Duplicate** — clones the module + a new ID, inserts as next sibling
- **Delete** — removes the module from the DOM and the store
- **Rename** — inline rename (updates `displayLabel` + `__instanceName`)
- **Move up / Move down** — reorders among siblings

The menu disappears on click-outside, Escape, or after an action runs.

## Why this is its own feature

A context menu is a cluster: it has to capture right-clicks, position itself near the cursor, render the right actions for what's selected, route each action through the right fragment (inspector, store, DOM), and tear itself down. Removing any one breaks it.

## Inputs

- `openContextMenu({ x, y, target, kind, id })` — show the menu
- `closeContextMenu()` — hide the menu
- `isContextMenuOpen()` — boolean
- Listens to `window.FreshVibeCmsSelection` for the current selection

## Outputs

- A floating menu element (`<div class="fvcms-context-menu">`) positioned at (x, y)
- DOM mutations: duplicate, delete, move (via insertBefore)
- Store writes: putModule (rename, duplicate), deleteModule (delete)
- Selection updates: new module ID after duplicate

## What depends on it

- `runtime/visualizer.js` could right-click a region tag (future)
- `runtime/navigator.js` could right-click a tree row (future)
- Right now, the menu is opened programmatically via `openContextMenu(...)`

## The rules (invariants)

1. **Menu captures the click that opened it** — stops propagation so the host page doesn't see the right-click.
2. **Menu dismisses on outside click** — uses a one-shot document listener that removes itself after firing once.
3. **Menu dismisses on Escape** — listens for keydown.
4. **Actions are pure** — clicking "Edit" opens the inspector and closes the menu. No side effects beyond the action.
5. **Duplicate gets a fresh ID** — never reuse the source ID.
6. **Delete is undoable** — pushes to the undo stack before removing.
7. **Move respects boundaries** — "Move up" at the top is a no-op; same for "Move down" at the bottom.

## Public API

```
openContextMenu({ x, y, target, kind, id })  → void
closeContextMenu()                            → void
isContextMenuOpen()                           → boolean
```

## CSS hooks

- `.fvcms-context-menu` — the floating menu container
- `.fvcms-context-menu-item` — each row
- `.fvcms-context-menu-item:hover` — hover state
- `.fvcms-context-menu-divider` — separator between groups
- `.fvcms-context-menu-danger` — destructive actions (delete)

## Migration path

Today, no context menu exists in freshvibe-cms. After this lands, Oscar-web can wire right-click on tree rows to call `openContextMenu(...)`. Future consumers (Shopify, Webflow) wire it similarly.

## Where to look

- `app-fragments/fragments.md §Area 1` — feature index entry
- `runtime/store.js` — `putModule`, `deleteModule` (used by actions)
- `app-fragments/editor-inspector/fragment.md` — "Edit" action opens the inspector
- `app-fragments/editor-selection/fragment.md` — selection state the menu reads