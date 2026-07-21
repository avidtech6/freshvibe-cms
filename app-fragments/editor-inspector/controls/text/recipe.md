# Recipe: Floating Label Text Input

**Version:** v8.0.0
**Type:** Form Control
**Status:** Stable

### Objective
Implement a single-line text input with a floating label that animates up when the field is focused or contains a value.

### Functional Requirements
1. **Container**: A wrapper div to handle relative positioning for the label.
2. **Input**: Standard HTML5 `<input>`.
3. **Label**: An `<label>` positioned absolutely. It starts 100% top, 100% left and scales 0.8 opacity when empty.
4. **Interaction**:
   - `focus`: Label moves up (shift-y: -1.5em) and scales.
   - `blur`: If input is empty, label returns. If value exists, label stays.
5. **Value Handling**: Debounce input events by 300ms before calling `onChange`.

### Sub-controls
- `value` (String): Initial content.
- `placeholder` (String): Display text.
- `maxLength` (Number): Input limit.
- `pattern` (String): Regex for validation.