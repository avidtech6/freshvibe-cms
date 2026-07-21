# Rules: Styling & Interaction

### Visual Rules
1. **Container**: `position: relative`. Width 100%.
2. **Input**: No border initially. Bottom border only (`border-top: 1px solid var(--border)`). Focus `border-color: var(--accent-2)`.
3. **Label**: Absolute top 100%, left 0. Font-size 16px. Transition all 0.2s ease-out.
4. **Floating State**: Transform `translateY(-1.5em) scale(0.85)`. Color `var(--accent-2)`.

### Interaction Rules
1. **Pinning**: Once floating, label stays pinned regardless of focus/blur state until value is cleared.
2. **Debounce**: Use `setTimeout` to prevent firing `onChange` on every keystroke.
3. **Validation**: If `pattern` is provided, validate `input.value` and apply red border if invalid.