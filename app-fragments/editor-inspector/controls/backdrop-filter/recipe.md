# Recipe: Backdrop Filter Control

## Objective
Provide a quick-access UI for CSS `backdrop-filter` property, commonly used for glassmorphism effects.

## Context
`backdrop-filter` (blur/contrast) requires complex values like `blur(10px)` or `grayscale(50%)`. A preset picker speeds up development.

## Behavior
1. **State:** `value: 'none' | 'blur(10px)' | 'blur(20px) saturate(150%)' ...`
2. **UI:** A row of pill-shaped buttons representing common presets.
3. **Interaction:** Clicking a button updates the state and `onChange`.