# Recipe: Background Image

**Goal:** Allow users to select an image source and configure CSS properties like `background-size`, `background-position`, `background-attachment`, and blend modes.

**User Flow:**
1. **Upload Area:** Large clickable area with drag-drop styling or text "Upload Image".
2. **Image Preview:** Shows the selected image.
3. **Properties Panel:**
   - **Fit:** Select dropdown (Cover, Contain, Fill, None).
   - **Position:** Select dropdown (Center, Top-Left, etc.).
   - **Attachment:** Select dropdown (Scroll, Fixed, Local).
   - **Overlay:** Color picker (adds color on top of image).
   - **Blend Mode:** Select dropdown (Normal, Multiply, Screen, Overlay).
4. **Clear:** Button to remove image.

**Sub-controls:**
- `value`: Object `{ url, fit, position, attachment, overlay, blend }`.
- Default: `{ url: '', fit: 'cover', position: 'center', attachment: 'scroll', overlay: '#000000', blend: 'normal' }`.