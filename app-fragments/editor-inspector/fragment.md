id: fragment.editor-inspector.001
freshvibe_way_version: v8
date: 2026-07-10

# editor-inspector — the panel that edits one module instance

## What it does

When the user clicks a module (via outline tag, navigator row, or any other path that calls `FreshVibeCmsSelection.select({kind: 'module', id})`), the inspector opens as a PanelManager panel docked to the right edge.

The inspector shows:
- **Fields tab** — a form generated from the module's schema. Every field type (text, number, boolean, color, url, image, select, array, object) renders as the right input.
- **Variants tab** — preset configurations from the module definition. One click applies a whole variant.
- **Raw JSON tab** — direct edit of the module's `config` object, with validation (red border on bad JSON, save on blur).

Edits write through the store and trigger the Stage F renderer, which patches the live DOM in place. Undo stack captures every change.

## Why this is its own feature

The inspector is a cluster of capabilities:

1. **Open on selection** — listens to FreshVibeCmsSelection, opens for `kind: 'module'`
2. **Render form from schema** — `renderFormEditor` walks the module's schema and produces fields
3. **Nine field types** — text, number, boolean, color, url, image, select, array, object
4. **Variants** — apply preset configurations in one click
5. **Raw JSON escape hatch** — for when the form doesn't have a field for what you need
6. **Save flow** — write to store, fire the renderer, show "✓ Saved" feedback
7. **Undo** — every change is captured; the existing 20-entry undo stack works

Removing any one of these breaks the user's ability to edit. Cluster rule holds.

## Inputs

- `openEditorShell({ moduleInstance, moduleDef, onSave, store })` — open a panel for one instance
- Selection is read from `window.FreshVibeCmsSelection`. The inspector subscribes:
  - `kind: 'module', id` → open editor for that module
  - `kind: 'region', id` → no-op (region editor is separate)
  - `null` → no-op
- `closeEditorShell(moduleId)` — explicitly close (used by undo of insert)

## Outputs

- A PanelManager panel (id pattern `fvcms-edit-{moduleId}`)
- DOM updates: form fields, "Saved" flash, tab switching
- Store writes: `putModule(moduleInstance)` after every save
- Custom event `fvcms:editor-saved` with detail `{ moduleId, config }` for other features to react

## What depends on it

- **`runtime/outline.js`** — module tag click fires the selection that triggers the inspector
- **`runtime/navigator.js`** — tree row click sets selection to the matching module
- **Future** `editor-context-menu` — "Edit" action opens the inspector for the selection
- **Future** `editor-breadcrumb` — last segment click opens inspector

## The rules (invariants)

1. **Inspector opens via selection, not direct call** — outline / navigator / future features set selection, inspector reacts. This decouples the data path from the UI path.
2. **Save goes through the store** — never directly mutate the DOM. Store → renderer → DOM.
3. **Every field type is bidirectional** — the schema declares the field; the renderer reads the schema, the field editor reads the value, on change it writes the value back.
4. **Raw JSON validates** — red border on bad JSON, save ignored until valid.
5. **Variants apply atomically** — clicking a variant replaces the entire config (per V8 "Stitch" semantics — variants are full configurations, not partials).
6. **Inspector survives module rename** — keyed by `moduleId`, not displayLabel. Renaming the instance label doesn't reopen or duplicate the panel.
7. **One panel per module** — opening the same module twice focuses the existing panel, doesn't create a duplicate.

## Public API

```
openEditorShell({ moduleInstance, moduleDef, onSave, store })  → Panel | null
closeEditorShell(moduleId)                                       → void
```

The existing `renderFormEditor({ moduleInstance, moduleDef, onSave })` is re-exported from `runtime/index.js` for advanced use cases (embedding the form in a non-panel context).

## CSS hooks

- `.fvcms-editor-body` — the panel body
- `.fvcms-editor-status` — header line with module id + saved flash
- `.fvcms-editor-tab-content` — the active tab's content area
- `.fvcms-tab-active` — class on the active tab button
- `.fvcms-editor-fields` — the form fields container (in raw form-editor)
- `.fvcms-variant-btn` — variant button
- `.fvcms-editor-variants` — variants section

## Migration path

Today, the inspector lives in `runtime/editor-shell.js` and `runtime/form-editor.js` (already factored). After this feature ships, consumers just import `openEditorShell` from `runtime/index.js`. Oscar-web replaces its inline inspector with this shared one.

The selection-driven open path is NEW behavior. Today, the inspector is opened by direct call (`openEditorShell(...)` from outline click handlers). After this lands, the call is triggered by a selection change subscription inside `editor-shell.js` itself.

## Where to look

- `app-fragments/fragments.md §Area 1` — feature index entry
- `runtime/editor-shell.js` — the panel wrapper
- `runtime/form-editor.js` — the form rendering
- `runtime/scope.js` — field-level write safety
- `app-fragments/editor-selection/fragment.md` — the selection state this reacts to