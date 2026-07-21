# Rules: Styling & Interaction

### Visual Rules
1. **Colors**: Text uses `--text`. Active text uses `--text-mid`. Borders use `--border`.
2. **Trigger**: Box border radius `--r-sm`. Padding `8px 12px`.
3. **Dropdown**: Absolute position, width 100%. Background `--panel`. Shadow for depth.
4. **Option Hover**: Background `--panel-2`, text brightness `1.2`.
5. **Selected Option**: Background tint of `--accent` with low opacity.

### Interaction Rules
1. **Focus**: Trigger border color `--accent-2` (2px).
2. **Search**: Input padding 4px 8px. Font size 13px.
3. **Keyboard**: Prevent default scrolling when using arrow keys inside the listbox.
4. **Accessibility**: Each option must have `role="option"`. Search input must have `aria-autocomplete="list"`.