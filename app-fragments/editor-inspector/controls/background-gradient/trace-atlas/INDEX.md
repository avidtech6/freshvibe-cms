# Data Flow Trace

**Input:**
```json
{
  "value": { "type": "linear", "angle": 45, "stops": [{ "color": "#ff0000", "pos": 0 }, { "color": "#0000ff", "pos": 100 }] }
}
```

**Render Cycle:**
1. Detect type.
2. If linear, render Angle slider.
3. Loop stops -> create UI row (Color + Slider + Remove).
4. Render Preview bar -> calculate widths based on stop positions.
5. Render Add Button.

**Drag Interaction:**
1. User mousedowns on handle at 50%.
2. `mousemove` calculates new % (e.g. 65%).
3. Update internal `state.stops[1].pos = 65`.
4. `onChange` emits new state.
5. Re-render UI (visual feedback).