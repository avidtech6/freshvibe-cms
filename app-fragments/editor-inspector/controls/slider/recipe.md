# Control: Slider

## Overview
A continuous input control that renders a track, a draggable handle, and a numeric value display. Used for linear adjustments like opacity, sizing, or positioning.

## Contract (v8)
- **Control Type**: `slider`
- **Input Schema**: `number` (current value)
- **Configuration**:
  - `min`: Number (default 0)
  - `max`: Number (default 100)
  - `step`: Number (default 1)
  - `unit`: String (e.g., "px", "%")
- **Behavior**:
  - Drag handle to slide.
  - Double-click value input to type exact value.
  - `onChange` fires with the new value.
  - Debounced (50ms) while dragging, immediate on release.

## DOM Structure
- Container (Flex row)
  - Track (Progress bar background)
  - Handle (Absolute positioned circle on track)
  - Value Display (Input number, right aligned)