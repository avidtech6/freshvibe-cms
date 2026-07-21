# Codex: Background Color Logic

**Data Structure:**
The state is expected to be a string or object.
*   String: `#RRGGBB` or `#RRGGBBAA`.
*   Object: `{ hex: '#RRGGBB', alpha: 1 }` (internal normalization).

**Normalization Algorithm:**
1. Parse input `val`.
2. If `val` starts with `#`:
   - Strip `#`.
   - If length is 6, alpha is 1.
   - If length is 8, alpha is `parseInt` (last 2 digits) / 255.
3. Convert to RGBA object for display.
4. Back-convert RGBA to Hex for the input field.

**Input Handling:**
- Listen for `input` event on Hex field.
- Enforce 7 chars (length 6) for standard Hex.
- Listen for `input` on Alpha slider.
- Update UI preview.

**Export:** `export function render(field, value, onChange, adapter)`