# Recipe: Background Color

**Goal:** Provide a single-channel color control with optional alpha transparency.

**User Flow:**
1. User sees a preview swatch.
2. User can type a Hex code (`#FF0000`) in an input field.
3. If `showAlpha` is true, a slider below allows alpha adjustment (0.0 - 1.0).
4. Changing the Hex input updates the Alpha slider (normalized) and the preview.
5. Changing the Alpha slider updates the Hex input string and the preview.

**Interface Specs:**
- Container: Flex column, padded.
- Top: Swatch block (height 40px, border radius).
- Middle: Hex input (uppercase, width 100%, sans-serif).
- Bottom (Conditional): Alpha slider track with a thumb.

**Sub-controls:**
- `value`: String representing Hex + Alpha (e.g., `#ff0000` or `rgba(0,0,0,0.5)`).
- `showAlpha`: Boolean flag (default `false`).

**Integration:**
- Called via `FES.registerControl('background-color', ...)` if type differs.