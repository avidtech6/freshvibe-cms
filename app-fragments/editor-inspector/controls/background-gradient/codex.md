# Codex: Gradient Logic

**State Management:**
- `state`: Copy of incoming `value`.
- `stops`: Array of `{ id, color, pos }`.

**Position Normalization:**
- Slider 0-100 maps to state 0-100.
- Dragging a handle updates state and re-renders only the handle's visual position (or entire bar for simplicity in v8).
- Ensure stops are always sorted by position.

**Color Conversion:**
- Need `rgbToHex` helper.
- Stop handles need a small dot positioned absolute on the preview bar.

**Event Handling:**
- `mousedown` on handle: Start drag loop.
- `mousemove` (window): Calculate new pos, update state.
- `mouseup` (window): Stop drag, call `onChange`.
- `input` on color picker: Update color, call `onChange`.