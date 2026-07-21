# Recipe: CSS Filter Control

## Objective
Allow precise tuning of visual filter properties (`filter: ...`) for an element.

## Context
Filters enable transformations like blurring, brightness adjustments, and contrast changes without affecting layout flow.

## Behavior
1. **State:** `value: { blur: 0, brightness: 100, contrast: 100, saturate: 100, opacity: 100 }` (units included in value).
2. **UI:** A list of rows. Each row contains a label, a range slider, and a numeric value readout.
3. **Interaction:**
   - Slider changes update the specific key in the state object.
   - "Reset" button sets all to 0/100.
4. **Output:** Generates a string like `blur(5px) brightness(120%) contrast(90%)`.