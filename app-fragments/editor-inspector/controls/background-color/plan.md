# Development Plan

1. **HTML Structure:** Main container, Swatch container, Input group (Text + Alpha), Label.
2. **CSS:** Dark theme styling, custom range slider styling (webkit/moz).
3. **JS:**
   - `init()`: Bind events.
   - `updateColor(hex)`: Sync slider.
   - `updateAlpha(val)`: Sync hex.
   - `render()`: Construct DOM.
4. **Testing:** Check standard colors, full transparency, and corner cases (e.g. `#G00`).