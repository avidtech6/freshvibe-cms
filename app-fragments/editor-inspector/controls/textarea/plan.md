# Plan: Development

1. **HTML**: `div.fes-control-textarea > textarea`.
2. **CSS**: `display: block`. `resize: none`.
3. **JS**:
   - Create function `autoResize()`.
   - Reset height.
   - Set height = scrollHeight.
   - If scrollHeight > maxHeight, set to maxHeight and overflow auto.
   - Add debounce.