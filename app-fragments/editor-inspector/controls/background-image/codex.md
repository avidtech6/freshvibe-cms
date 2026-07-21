# Codex: Background Image Logic

**Parsing Value:**
- `url`: String (source).
- `fit`: String.
- `position`: String.
- `attachment`: String.
- `overlay`: String (Hex).
- `blend`: String.

**Rendering Preview:**
- Apply `background-image: url(...)`.
- Apply `background-size: ...`.
- Apply `background-position: ...`.
- Apply `background-attachment: ...`.
- Apply `background-blend-mode: ...`.
- Apply overlay via `background-color` or pseudo-element? `background-color` is standard for "overlay".

**Validation:**
- If `url` is empty, disable properties.

**Event Handling:**
- `onchange` triggers on any property change.