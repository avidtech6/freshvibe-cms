# Codex: Number Implementation

**Environment:** FES Inspector
**Tech:** Vanilla ES6

### Logic Flow
1. **Mount**: Parse props. Convert value to Number.
2. **Render**: Create Wrapper (flex), Input (read-only), Buttons (-/+).
3. **Step Logic**:
   - `changeAmount` = `field.props.step`.
   - `changeAmount *= 10` if `e.shiftKey`.
   - `newValue = currentValue +/- changeAmount`.
   - `newValue = clamp(newValue, min, max)`.
4. **Events**:
   - Button Click: Trigger `step`.
   - Input (optional): Allow manual typing (though Read-only is preferred for stepper controls, simple implementation allows typing).