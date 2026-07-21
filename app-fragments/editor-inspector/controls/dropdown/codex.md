# Codex: Dropdown Implementation

**Environment:** FES Inspector
**Tech:** Vanilla ES6

### Logic Flow
1. **Mount**: Initialize with `field.props` (options, value) and `field.state` (isOpen).
2. **Render**:
   - Create Trigger Button.
   - If `isOpen`, create Dropdown Container (absolute).
   - If `searchable` + `isOpen`, create Search Input.
   - Create Listbox (scrollable container).
   - Render Option items based on filtered list.
3. **Events**:
   - Trigger Click: Toggle `isOpen`.
   - Search Input `input`: Filter `field.props.options`, re-render Listbox.
   - Option Click: Call `field.onChange(option.value)`, set `isOpen = false`.
   - Global `click`: Check if target is inside Dropdown. If not, `isOpen = false`.
   - Global `keydown`: Listen for Escape (close) or Enter (select).
4. **Cleanup**: Remove event listeners on unmount (if applicable).

### Adapter Contract
```js
{
  mount: (el) => { ... },
  update: (field, value) => { ... }, // Updates DOM based on new props/state
  destroy: () => { ... }
}