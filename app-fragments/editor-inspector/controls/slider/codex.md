# Codex: Slider Implementation

## Tech Stack
- Vanilla JS (ES6+)
- Native DOM API (createElement, addEventListener)
- Flexbox for layout
- CSS Variables for theming

## Algorithm: Drag-to-Value
1. **Init**: Calculate percentage of value relative to (max - min).
2. **Start Drag**: Set global flag `isDragging = true`. Capture initial mouse Y/X and initial slider values.
3. **On Drag**: Calculate delta. Convert delta to value units. Clamp to min/max. Update DOM and state.
4. **Stop Drag**: Set `isDragging = false`. Emit final event.
5. **Debounce**: Use `requestAnimationFrame` or a timer to batch updates during drag.

## Edge Cases
- If user clicks exactly on the edge, clamp strictly.
- If value is non-numeric, treat as 0.
- Handle focus loss on value input.