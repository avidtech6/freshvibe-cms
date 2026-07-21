# CONTROL RECIPE: Motion Grid

## Objective
Provide a grid-based interface to select animation types (e.g., from a library of FvW motions).

## Contract
**Input:**
- `field`: Object containing configuration.
  - `options`: Array of objects `{ value, label, icon }`.
  - `value`: String (selected animation).
  - `columns`: Number (default 3).

**Output:**
- String (selected animation) on change.

## Functional Requirements
1. **Grid Layout**: 3 columns by default.
2. **Tile**: Aspect ratio 1.4.
3. **Selection**: Border and text color change on selection.
4. **Default Options**: If options empty, provide standard set.

## UI Layout
[Tile 1] [Tile 2] [Tile 3]
[Tile 4] [Tile 5] [Tile 6]

## Edge Cases
- Layout shifts on selection.