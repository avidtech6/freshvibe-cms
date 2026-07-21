# CONTROL RECIPE: Tags Input

## Objective
Implement a tag management system allowing users to add, remove, and select multiple tags via a single input.

## Contract
**Input:**
- `field`: Object containing configuration.
  - `value`: Array of strings.
  - `placeholder`: String (default "Add tag...").
  - `maxTags`: Number (optional, prevents overflow).

**Output:**
- Array of strings on change.

## Functional Requirements
1. **Display**: Render pills (tags) with remove (×) buttons.
2. **Addition**: Type text + Enter (or Comma) to add.
3. **Removal**: Click × or Backspace on empty input.
4. **Validation**: Check for duplicates (optional, usually allowed) and max limits.

## UI Layout
[Chip 1] [Chip 2] [Chip 3] ... [Input]

## Edge Cases
- Duplicate tags (behavior: keep first, add second).
- Rapid deletion.