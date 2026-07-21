# Development Plan

1. **State:** Create `stops` array based on input value.
2. **Helpers:** `rgbToHex`, `getGradientCss`.
3. **UI Components:**
   - Tabs (None/Linear/Radial/Conic).
   - Angle Slider.
   - Stop List (Dynamic).
   - Preview Bar (Absolute positioned handles).
4. **JS Logic:**
   - `handleDragStart(e, index)`
   - `handleDragMove(e)`
   - `handleDragEnd()`
   - `addStop()`, `removeStop(index)`