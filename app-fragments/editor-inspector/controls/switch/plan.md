# Plan: Development

1. **HTML**: `div.fes-control-switch` > Label + Input (hidden) + Span(track) + Span(thumb).
2. **CSS**: Absolute positioning for thumb inside relative track. Transitions.
3. **JS**:
   - Create state var `isChecked`.
   - Function `toggle()`: `isChecked = !isChecked`. Update ARIA. Update Transform.
   - Event listener on Span.