# Codex: Responsive Implementation

## Tech Stack
- Vanilla JS
- CSS Flexbox

## Logic: Override State
- Maintain `overrideState` object: `{ tablet: false, mobile: false }`.
- If `overrideState[key]` is false:
  - Input disabled.
  - Value is ignored (use desktop value).
  - Icon is grayed out or stroked.
- If true:
  - Input enabled.
  - Input reflects the specific value.
  - Icon is filled/colorful.

## Logic: Inheritance UI
- If override is false, display text "Inherits Desktop" next to icon or input. Prompt says "shows as 'inherits desktop' (grayed out, input disabled)".