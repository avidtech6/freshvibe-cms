id: fragment.editor-outline.001
freshvibe_way_version: v8
date: 2026-07-10

# editor-outline — yellow tag overlays on the page

## What it does

Spawns floating yellow tags on each region and module on the page. The tags pin to the top-left corner of their target element and follow the element as the user scrolls. Click a tag to focus that region or module.

There are two kinds of tags:

- **Region tags** — `REGION: <label>` pinned to each region. Bigger, bolder yellow.
- **Module tags** — `W-NN: <type>` pinned to each module inside the currently-selected region. Smaller, distinct colour so they don't get confused with region tags.

## Why this is its own feature

Outline is one user-facing capability: "see what's editable, click to focus." But under the hood it's a cluster of related mechanisms:

1. **Spawn tags** — read live data, build DOM, position with rAF
2. **Track scroll/resize** — tags follow their target via `requestAnimationFrame`
3. **Click to focus** — region tag activates its panel, module tag activates its editor
4. **Selection highlight** — the tag for the currently-selected region/module gets a glowing outline + purple accent
5. **Tear down** — remove all tags without leaking DOM nodes or rAF loops

Removing any one breaks the operator's ability to navigate. Cluster rule holds.

## Inputs

- `startOutlines()` — show region tags for all regions, module tags for the selected region
- `stopOutlines()` — remove every tag
- `isOutlinesActive()` — boolean
- `refreshOutlines()` — re-render after data changes (e.g. new region added, label renamed)
- Selection is read from `window.FreshVibeCmsSelection`. No direct `select()` calls here.

## Outputs

- DOM nodes with class `fvcms-region-tag` (one per region)
- DOM nodes with class `fvcms-module-tag` (one per module in the selected region)
- Click handlers that route through PanelManager + selection state
- A teardown path that cancels all rAF loops and removes DOM nodes

## What depends on it

- **`runtime/visualizer.js`** calls `startOutlines()` when region overlays are shown, `stopOutlines()` when hidden.
- **`runtime/editor-shell.js`** calls `refreshOutlines()` after a module edit (in case the label changed).
- **`runtime/cms-panel.js`** calls `startOutlines()` when the dock panel opens.
- **Future consumers** (Shopify, Webflow) call `startOutlines()` to enable editing on their pages.

## The rules (invariants)

1. **Tags are `position: fixed`** — they need to escape any container that might clip them.
2. **Tags follow scroll via rAF** — one rAF per tag, cancelled when the tag is removed. No interval timers.
3. **Tags are removed on `stopOutlines()`** — no orphans left in DOM.
4. **Tags read selection from `FreshVibeCmsSelection`** — they don't carry their own state.
5. **Tag clicks route through PanelManager + selection** — they never directly mutate store state.
6. **The selected region's tag has a purple outline + glow** — visual distinct from the unselected ones (per operator plan v4 "yellow + purple accent").
7. **No framework names** — outline is framework-agnostic.

## Public API

```
startOutlines()             → void
stopOutlines()              → void
isOutlinesActive()          → boolean
refreshOutlines()           → void
```

## CSS hooks

- `.fvcms-region-tag` — region tag styling
- `.fvcms-region-tag.is-selected` — selected region (purple accent + glow)
- `.fvcms-module-tag` — module tag styling
- `.fvcms-module-tag.is-selected` — selected module

These live in `runtime/styles.css` alongside the editor's other overlay styles.

## Migration path

Today, `runtime/visualizer.js` has the `showRegionTags()` / `hideRegionTags()` functions inline. After this feature ships, those move to `runtime/outline.js`. `visualizer.js` calls into outline.js for the tag pieces only (it keeps region panel spawning).

Module tagging (one tag per W-N module inside the selected region) is a NEW behavior added here. Previously only region tags existed; module navigation went through the structure tree.

## Where to look

- `app-fragments/fragments.md §Area 1` — feature index entry
- `runtime/visualizer.js` — the panel manager piece that calls startOutlines/stopOutlines
- `app-fragments/editor-selection/fragment.md` — selection state the outline reads from
- `app-pact/app-pact.md §3.4` — runtime doesn't touch host DOM (outline respects this — it adds its own overlays, doesn't mutate host nodes)