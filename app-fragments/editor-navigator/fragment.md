id: fragment.editor-navigator.001
freshvibe_way_version: v8
date: 2026-07-10
last_rewritten: 2026-07-11 (Elementor-parity expansion per operator)

# editor-navigator — structure tree of the page

## What it does

Renders a tree view of every editable element on the page. Sections and containers nest; widgets sit inside their containers.

**The Navigator is the Elementor Navigator.** Same shape, same six behaviors, same interactions. The operator already knows how to use it because Elementor trained them.

## Why this is its own feature

The Navigator is a cluster of related capabilities (cluster rule holds):

1. **Walk the live DOM** — find every element with a recognised framework class token (Elementor, Gutenberg, Webflow)
2. **Build a nested tree** — top-level sections, their columns/containers, their widgets
3. **Render with icons + labels** — type pill (S for Section, C for Column, H, P, I, B… for widgets) + a human label from the element's content
4. **Click to select** — sets the shared selection state, page scrolls to the element, the appropriate panel opens in the dock
5. **Hover to highlight** — the live page element gets a thin blue outline so the operator can see which tree node corresponds to which on-page thing
6. **Drag to reorder** — uses native HTML5 drag-and-drop, mutates the live DOM via insertBefore. The physical element on the page moves to match the new tree position. This is the killer feature.
7. **Visibility toggle (eye icon)** — per-row eye icon, click to hide that element on the page, click again to show
8. **Inline rename** — double-click the row label to edit the display name. The canonical type never changes — only the display label. (Per invariant I-010.)
9. **Right-click context menu** — Duplicate, Delete, Copy, Paste, Rename (per editor-context-menu feature)
10. **Expand/collapse** — per-node state, persisted across re-renders
11. **Live updates** — when the page changes (new section added, etc.), the tree refreshes

Removing any one of these breaks the operator's ability to navigate. Cluster rule holds.

## The six Elementor-parity behaviors (operator-locked 2026-07-11)

These are the explicit, named behaviors. Each must work. Each has a test.

### B1 — Click an item in the tree
- Page scrolls to the element
- The element gets a blue focus outline on the page
- The element's panel opens in the dock (region panel for sections, module panel for widgets)
- The tree row gets a yellow background indicating "this is what's selected"
- Selection state is set: `selection.kind = 'region' | 'module'`, `selection.id = ...`

### B2 — Hover an item in the tree
- The corresponding on-page element gets a thin blue outline (Elementor's hover highlight)
- The outline follows the element if the page scrolls while hovering
- Move the mouse away → outline disappears

### B3 — Drag an item to a new position
- Grab any row, drag it to another position in the tree (or to a different column/section)
- The on-page element physically moves to match
- Implementation: `parentNode.insertBefore(draggedEl, targetEl)`, NOT clone-and-replace, NOT innerHTML wipe
- The DOM identity is preserved (same element moves, no new element created)
- After drop, the tree rebuilds to reflect the new structure
- The "drop here" indicator is visible during drag (Elementor shows a thin blue line between rows where the drop will land)

### B4 — Visibility toggle (eye icon)
- Each row has a small eye icon on the left (before the icon)
- Click the eye → the on-page element gets `style.display = 'none'`
- Click the eye again → display restored
- The eye icon changes appearance (open eye / closed eye / crossed-out eye) to reflect state
- Per-element state is in-memory only (reloading the page restores the original visibility)

### B5 — Inline rename
- Double-click the row label → the label becomes a text input with the current label selected
- Type a new name, press Enter → the canonical `displayLabel` is updated
- Press Escape → cancel, no change
- Click outside → commit, same as Enter
- The canonical type (`moduleId`, `regionId`) never changes — only the display name (per invariant I-010)

### B6 — Right-click context menu
- Right-click any row → the FES context menu opens
- Menu items: Edit, Rename, Duplicate, Delete, Copy, Paste
- Per editor-context-menu fragment

## Tree shape

```
📁 Section 1                              👁
  📦 Column 1                            👁
    🔘 H  "Learn with Nature"            👁
    🔘 P  "Bring nature into..."        👁
  📦 Column 2                            👁
    🔘 I  oscar-tree-photo.jpg           👁
    🔘 B  "Contact"                      👁
📁 Section 2 (Post grid)                 👁
  📦 Column 1                            👁
    🔘 C  [carousel of books]            👁
```

The eye icon (👁) is on the right of each row, on the same row. (Elementor puts it on the left; either is fine — pick one and be consistent.)

The folder icon (📁) is for sections/columns (containers). The square icon (🔘) is for widgets.

Type pills: H = heading, P = paragraph, I = image, B = button, C = carousel. Single letter when unambiguous, two letters when needed.

## Inputs

- `buildNavigator()` — returns a DOM tree element ready to be inserted into a panel
- `refreshNavigator()` — re-walks the DOM, rebuilds the tree (called when data changes)
- Selection is read from `window.FreshVibeCmsSelection`. Click handlers route through selection.
- Drag-drop uses native HTML5 drag events; no third-party library.

## Outputs

- A DOM tree where each node is a `<div class="fvcms-tree-node">` containing:
  - A drag handle (the row itself is draggable, or a small grip on the left)
  - A visibility eye icon (`<button class="fvcms-tree-eye">`)
  - An expand/collapse chevron (▾/▸) for nodes with children
  - A type icon (📁 / 🔘)
  - A type pill (uppercase, abbreviated)
  - A human-readable label (becomes editable on double-click)
  - Children wrapped in `<div class="fvcms-tree-children">`
- Click handlers that route through `FreshVibeCmsSelection.select()`
- Drag handlers that mutate the live DOM via `parentNode.insertBefore()`
- Hover handlers that show a blue outline on the live page
- Visibility toggle handlers that set `style.display = 'none'`
- Rename handlers that update `displayLabel` via the store
- Context menu handlers (delegated to editor-context-menu)

## What depends on it

- **CMS panel's Navigator tab** (host app, Oscar-web) renders the Navigator. The CMS panel may or may not have a Navigator tab — host's call. The Navigator always works the same way.
- **Outline feature** (`runtime/outline.js`) reads the tree to know what's selectable.
- **Module panel** reads selection to populate fields.
- **Region panel** (host app) reads selection to populate region settings.

## The rules (invariants)

1. **Tree mirrors the live DOM** — if you add a section in DevTools, `refreshNavigator()` shows it.
2. **Click routes through selection** — never directly mutates store state.
3. **Drag mutates the live DOM** — uses `parentNode.insertBefore()`, not innerHTML or clone-and-replace. (Per I-002.)
4. **No framework names in selector logic** — class patterns are documented (Elementor, Gutenberg, Webflow tokens) but the walker is generic; any class matching the patterns works.
5. **Empty state is graceful** — "No editable elements found on this page." instead of an empty box.
6. **Expand/collapse state survives re-renders** — stored on the DOM node itself.
7. **Drag source != drag target** — same-node drops are no-ops.
8. **Drop indicator is visible during drag** — a thin blue line shows where the element will land.
9. **Visibility toggle is per-row and persistent within a session** — does not write to the store (it's a UI-only state, not a content edit). Per §3.4 (runtime doesn't touch host DOM for content; visibility toggle is a UI affordance, not content).
10. **Rename preserves canonical type** — only `displayLabel` changes. (Per I-010.)
11. **All six Elementor-parity behaviors work** — B1 through B6, each has a test.

## Public API

```
buildNavigator()            → HTMLElement  (the tree, ready to insert)
refreshNavigator()          → void          (rebuilds and replaces existing tree in-place)
```

## CSS hooks

- `.fvcms-tree-node` — tree node container
- `.fvcms-tree-node .row` — the clickable row
- `.fvcms-tree-node .row.is-current` — currently selected (yellow tint)
- `.fvcms-tree-node .row:hover` — hover state (lighter tint)
- `.fvcms-tree-node .row .eye` — visibility eye icon button
- `.fvcms-tree-node .row.dragging` — currently being dragged (semi-transparent)
- `.fvcms-tree-node .row.drop-target` — drop indicator (blue line)
- `.fvcms-tree-children` — child container (display: none when collapsed)
- `.fvcms-tree-node .icon` — type icon (folder / square)
- `.fvcms-tree-node .pill` — type pill
- `.fvcms-tree-node .label` — human label
- `.fvcms-tree-node .label.editing` — label in rename mode (text input)

## Migration path

The current Navigator lives in Oscar-web's `app-fragments/oscar-cms-panel/oscar-cms-panel.js` (`buildStructureContent`, `buildTreeNode`, etc., ~250 lines). After this feature ships in full, that file is replaced by an import from `runtime/navigator.js`. The Elementor-parity behaviors B1-B6 all live in the FES.

**Note**: B1 (click) and B2 (hover) are mostly already done. B3 (drag-reorder) is partially done. B4 (visibility), B5 (inline rename), B6 (right-click) are new behaviors to add.

## Where to look

- `app-fragments/fragments.md §Area 1` — feature index entry
- `runtime/visualizer.js` — calls `refreshNavigator()` when overlays show/hide
- `runtime/outline.js` — sibling feature, reads same DOM
- `app-fragments/editor-selection/fragment.md` — selection state this writes to
- `app-fragments/editor-context-menu/fragment.md` — right-click menu
