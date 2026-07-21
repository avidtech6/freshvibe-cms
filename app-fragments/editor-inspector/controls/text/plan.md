# Plan: Development

1. **HTML Structure**: `div > label + input`.
2. **CSS**: Absolute positioning for label. Transition properties.
3. **JS - State**: Boolean `isFloating`.
4. **JS - Logic**: Event listener on Input.
   - On `focus`: `isFloating = true`.
   - On `blur`: `if (value === '') isFloating = false`.
5. **JS - Change**: `input.addEventListener('input', ...)`
6. **JS - Debounce**: Define timeout ID. Clear previous timeout on new input.