# Codex: Text Implementation

**Environment:** FES Inspector
**Tech:** Vanilla ES6

### Logic Flow
1. **Mount**: Get `field.props`. Create wrapper, input, label.
2. **Render**:
   - Apply `value` to input.
   - Check `value.length > 0` or `input === document.activeElement` to set "floating" class.
3. **Events**:
   - `focus`: Add "floating" class.
   - `blur`: Remove "floating" class if input value is empty.
   - `input`: Update internal state debounced.
   - `change`: Final update via onChange.
4. **Cleanup**: Clear debounce timer on unmount.