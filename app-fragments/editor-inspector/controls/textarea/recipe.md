# Recipe: Auto-Resizing Text Area

**Version:** v8.0.0
**Type:** Form Control
**Status:** Stable

### Objective
Implement a multi-line input that automatically resizes height to fit its content without scrollbars until the max limit.

### Functional Requirements
1. **Container**: Flexbox column. Width 100%.
2. **Input**: `textarea` with border-bottom style (or box).
3. **Auto-Resize**:
   - Set `style.height = 'auto'`.
   - Set `style.height = scrollHeight`.
   - Apply on `input` event.
4. **Max Height**: Do not grow past a certain pixel height (e.g., 150px). Allow scroll inside if needed.
5. **Value Handling**: Debounce 300ms.

### Sub-controls
- `value` (String).
- `rows` (Number, default 3).
- `placeholder` (String).
- `maxLength` (Number).