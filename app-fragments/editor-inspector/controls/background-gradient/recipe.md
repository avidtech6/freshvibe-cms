# Recipe: Background Gradient

**Goal:** Provide a complete visual editor for linear, radial, and conic gradients.

**User Flow:**
1. **Type Selector:** Tabs to switch between `none`, `linear`, `radial`, `conic`.
2. **Angle Control:** Appears only for `linear`. Slider 0-360deg.
3. **Stops Management:** 3 default color stops.
   - Each stop has: Color picker, Position slider (0-100%).
   - Add button (+) to insert stop at end.
   - Remove button (×) for middle/last stops.
4. **Preview:** Horizontal bar showing gradient flow.
   - Click/Drag on bar to move a stop's position.
5. **Output:** Calls `onChange({ type, angle, stops })`.

**Sub-controls:**
- `value`: Object `{ type: 'linear', angle: 90, stops: [{ color: '#fff', pos: 0 }, ...] }`.
- `maxStops`: Optional limit (default 5).