# Recipe: Searchable Dropdown Control

**Version:** v8.0.0
**Type:** Form Control
**Status:** Stable

### Objective
Provide a flexible, searchable dropdown input for single-value selection. It combines a standard trigger button with a dynamically filtered listbox when enabled.

### Functional Requirements
1. **Trigger**: A styled button displaying the currently selected value or placeholder.
2. **Listbox**: A container appearing on trigger click. Must be positioned relative to the inspector panel.
3. **Search Mode**: When `searchable: true` and `options.length > 6`, a text input is injected into the listbox header to filter items in real-time.
4. **Selection**: Clicking an option sets the `value` and fires `onChange`.
5. **Interaction**:
    - Click outside listbox or press Escape to close.
    - Arrow keys navigate options (up/down).
    - Enter selects active option.
6. **Validation**: Returns null if no selection was made initially.

### Sub-controls
- `options` (Array of strings/objects): The list of choices.
- `value` (String): The currently selected value.
- `placeholder` (String): Text shown when empty (optional).
- `searchable` (Boolean): Enables filtering logic.

### Edge Cases
- Duplicate options: Treat as list items.
- Empty options array: Render button with placeholder only.
- No matching search: Show empty state in listbox.