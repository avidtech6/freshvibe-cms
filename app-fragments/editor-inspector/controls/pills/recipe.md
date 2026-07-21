# CONTROL RECIPE: Pill Selector

## Objective
Implement a selectable list of pills (buttons) where only one can be active at a time.

## Contract
**Input:**
- `field`: Object containing configuration.
  - `options`: Array of objects `{ value, label, icon? }`.
  - `value`: String (selected value).

**Output:**
- String (selected value) on change.

## Functional Requirements
1. **Render**: Generate a pill for each option.
2. **Selection**: Clicking a pill sets it as active.
3. **Layout**: Flex row, wrap to next line if needed.
4. **Icons**: Render optional icon next to label.

## UI Layout
[Option 1] [Option 2] [Option 3]

## Edge Cases
- Value not in options (fallback to first or empty).
- Empty options array.