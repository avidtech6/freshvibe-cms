# Control: Border Radius

## Overview
Allows editing of all four border radius corners (Top-Left, Top-Right, Bottom-Right, Bottom-Left).

## Contract (v8)
- **Control Type**: `radius`
- **Input Schema**: `object` `{tl, tr, br, bl}`
- **Configuration**:
  - `unit`: String (default "px")
- **Behavior**:
  - 4 inputs arranged in a grid or row.
  - Labels (TL, TR, BR, BL) above or next to inputs.
  - No link functionality (radius is inherently per-corner).
  - `onChange` emits `{tl, tr, br, bl}`.

## DOM Structure
- Container
  - Input Row
    - TL Input + Label
    - TR Input + Label
    - BR Input + Label
    - BL Input + Label
  - Unit Label (optional or separate)