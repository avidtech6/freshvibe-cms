# Data Flow Trace

**Input:**
```json
{
  "value": { "url": "image.jpg", "fit": "cover", "position": "center" }
}
```

**Render Cycle:**
1. Create container.
2. Create "Upload Zone" (dashed border).
3. Create "Settings Area" (hidden if no URL).
4. Render dropdowns for Fit, Position, Attachment.
5. Render Overlay Color Picker.
6. Render Blend Mode Dropdown.

**Change Event (Upload Image):**
1. User selects file or URL.
2. UI updates preview.
3. `onChange({ url: '...', ... })` emitted.

**Change Event (Blend Mode):**
1. Dropdown changes.
2. `onChange({ blend: 'multiply', ... })` emitted.