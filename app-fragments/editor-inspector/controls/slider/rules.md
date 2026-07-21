# Rules: Slider
1. **Accessibility**: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
2. **Input Validation**: Prevent typing outside min/max range.
3. **Visual Feedback**: Handle glows on hover/focus.
4. **Performance**: Do not re-render entire DOM on every pixel of drag; manipulate styles directly.