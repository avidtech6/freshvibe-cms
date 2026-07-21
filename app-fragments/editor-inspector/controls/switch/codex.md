# Codex: Switch Implementation

**Environment:** FES Inspector
**Tech:** Vanilla ES6

### Logic Flow
1. **Mount**: Create wrapper. Create Track (span) and Thumb (span).
2. **Render**:
   - If `value` is true, translate Thumb `100%` to right.
   - If false, translate `0%` to left.
3. **Events**:
   - Click: Invert `value`. Update `onChange`. Update CSS transform.
   - Focus/Blur: Update visual focus ring.