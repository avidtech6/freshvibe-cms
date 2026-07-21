# CONTROL RECIPE: Color Picker

## Objective
Implement a color selection control supporting hex codes and alpha transparency visualization.

## Contract
**Input:**
- `field`: Object containing configuration.
  - `value`: Hex string (6 or 8 chars). e.g., "#3B82F6" or "#3B82F699".
  - `showAlpha`: Boolean (default false).

**Output:**
- Single string on change.
- Validation ensures format compliance.

## Functional Requirements
1. **Visual Display**: Render a 30x28px swatch.
2. **Interaction**:
   - Clicking swatch triggers native `<input type="color">`.
   - User types hex manually in a synchronized input field.
   - If `showAlpha` is true, render an alpha slider (0-100%).
3. **Validation**:
   - Reject invalid hex codes.
   - Support `#RRGGBB` and `#RRGGBBAA`.
4. **Callback**: Call `onChange(newHex)` immediately on valid change.

## UI Layout
[Swatch] [Input Field] [Slider (Conditional)]

## Edge Cases
- Empty string handling.
- Native picker alpha support (browser dependent, maps to 8-char hex).