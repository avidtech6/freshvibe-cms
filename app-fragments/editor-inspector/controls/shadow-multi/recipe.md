# Recipe: Multi-layer Box Shadow Control

## Objective
Provide a granular, visual interface for defining complex `box-shadow` properties. Unlike a simple text input, this control allows users to stack multiple shadow layers (e.g., soft drop shadow + hard inner shadow + color glow).

## Context
Often, UI design requires layered depth. CSS `box-shadow` can be complex to construct manually with `x y blur spread color inset`. This inspector tool enables rapid composition of these layers.

## Behavior
1. **State:** `value: { layers: Array<{x, y, blur, spread, color, inset}> }`
2. **UI:** A list of rows, each representing a shadow layer.
3. **Interaction:**
   - Edit numeric fields (x, y, blur, spread) via number inputs.
   - Select color via native color picker.
   - Toggle "Inset" checkbox.
   - Click "×" to delete the layer.
   - Click "+ Add layer" to append a new default layer.
4. **Output:** Composes into a standard CSS `box-shadow` string (e.g., `2px 4px 10px rgba(0,0,0,0.5), inset 2px 2px 5px rgba(0,0,0,0.2)`).