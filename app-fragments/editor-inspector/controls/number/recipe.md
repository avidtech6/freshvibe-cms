# Recipe: Stepped Number Input

**Version:** v8.0.0
**Type:** Form Control
**Status:** Stable

### Objective
Provide a numeric input with stepper buttons (increment/decrement). Supports shift-click for larger steps.

### Functional Requirements
1. **Container**: Flexbox wrapper.
2. **Input**: Read-only visual field to show the value.
3. **Steppers**:
   - **-** (Minus): Decrements value by `step`.
   - **+** (Plus): Increments value by `step`.
4. **Shift-Click**: If user holds Shift and clicks, step by `step * 10`.
5. **Validation**: Clamp value between `min` and `max`. Prevent clicking if at bounds.

### Sub-controls
- `value` (Number).
- `min` (Number).
- `max` (Number).
- `step` (Number, default 1).
- `unit` (String, optional suffix).