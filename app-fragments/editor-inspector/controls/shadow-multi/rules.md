# Rules: Shadow UX & Accessibility

1. **Visual Feedback:** The preview box in the center of the panel must update in real-time as any field changes.
2. **Negative Numbers:** Inputs for X and Y axis should allow negative values (e.g., -5px).
3. **Layer Order:** The array index represents visual stacking order (Index 0 is the outermost/shadow, Index 1 is inner/more complex). Changing the *index* of a layer is not currently supported in v8, but deletion is.
4. **Defaults:** When adding a layer, default it to black/transparent. When deleting the last layer, keep one "ghost" layer or reset to standard CSS default if desired (currently: keep one empty layer).