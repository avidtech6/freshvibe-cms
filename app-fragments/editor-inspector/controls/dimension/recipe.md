# Control: Dimension (Box Model)

## Overview
Displays a 4-sided layout (Top, Right, Bottom, Left) with a "Link" toggle. This control is designed for CSS `margin`, `padding`, or `gap` management.

## Contract (v8)
- **Control Type**: `dimension`
- **Input Schema**: `object` `{top, right, bottom, left}`
- **Configuration**:
  - `unit`: String (default "px")
  - `linked`: Boolean (default true)
- **Behavior**:
  - Row of 4 inputs.
  - If `linked` is true, changing one input updates all 4.
  - If `linked` is false, each input can be edited independently.
  - Toggle link button updates state and icon visual.
  - `onChange` emits `{top, right, bottom, left}`.

## DOM Structure
- Container
  - Label/Wrapper (Flex row)
    - 4 Inputs (T, R, B, L)
    - Link Toggle Button