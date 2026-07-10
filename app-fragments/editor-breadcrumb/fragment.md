id: fragment.editor-breadcrumb.001
freshvibe_way_version: v8
date: 2026-07-10

# editor-breadcrumb — bottom-bar path

## What it does

A persistent bar at the bottom of the page showing where the user is in the page hierarchy. Click any segment to jump to that element in the navigator or open the inspector.

Format: `Page › Region › Section › Module`

## Why this is its own feature

A breadcrumb is a small but complete capability: it has to read the current selection, walk the DOM ancestry to build the path, render it as a horizontal bar, and wire each segment to a useful action. Removing any one breaks the value.

## Inputs

- `mountBreadcrumb(parent)` — show the bar inside a parent element
- `unmountBreadcrumb()` — remove the bar
- `isBreadcrumbMounted()` — boolean
- Reads selection from `window.FreshVibeCmsSelection` for the current module
- Walks DOM ancestry to derive the path

## Outputs

- A DOM bar with clickable segments
- Clicking a segment either selects that element or scrolls to it
- `fvcms:breadcrumb-navigate` custom event with detail `{ kind, id }` for other features

## What depends on it

- Future: dock panel could mount the breadcrumb at the bottom
- Future: full-screen editor mode could hide the breadcrumb until exit
- Today: nothing mounts it — feature is shipped, consumers wire it in

## The rules (invariants)

1. **Breadcrumb reflects current selection** — no segment shown for a non-selected element.
2. **Page is always shown** — even with no selection, the current page name is the first segment.
3. **Segments are click-to-jump** — clicking a region segment selects that region; clicking a module segment selects that module.
4. **Hidden when nothing is mounted** — only one breadcrumb at a time.
5. **Bottom-fixed positioning** — `position: fixed; bottom: 0; left: 0; right: 0`.
6. **No keyboard shortcuts** — segments are buttons, not key bindings.
7. **Graceful empty state** — when no page is active, the bar shows nothing (or "No page").

## Public API

```
mountBreadcrumb(parent)     → void
unmountBreadcrumb()          → void
isBreadcrumbMounted()        → boolean
```

## CSS hooks

- `.fvcms-breadcrumb` — the bottom bar
- `.fvcms-breadcrumb-segment` — each segment
- `.fvcms-breadcrumb-separator` — the `›` between segments
- `.fvcms-breadcrumb-segment.is-current` — currently selected segment
- `.fvcms-breadcrumb-segment:hover` — hover state

## Migration path

Today, no breadcrumb exists. After this lands, Oscar-web (or any consumer) calls `mountBreadcrumb(document.body)` to enable it. The bar is purely visual + click — no store mutations, no renderer calls.

## Where to look

- `app-fragments/fragments.md §Area 1` — feature index entry
- `app-fragments/editor-selection/fragment.md` — selection state the breadcrumb reads