# Codex: Textarea Implementation

**Environment:** FES Inspector
**Tech:** Vanilla ES6

### Logic Flow
1. **Mount**: Create textarea. Set initial height based on value.
2. **Render**: Update value.
3. **Resize Logic**:
   - `this.style.height = 'auto'` (Reset height)
   - `this.style.height = this.scrollHeight + 'px'`
4. **Constraints**: If `scrollHeight` > `maxHeight`, set height to `maxHeight` and allow scrollbar.