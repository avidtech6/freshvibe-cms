# Control: Responsive Breakpoints

## Overview
Allows setting values for specific screen sizes (Desktop, Tablet, Mobile).

## Contract (v8)
- **Control Type**: `responsive`
- **Input Schema**: `object` `{desktop, tablet, mobile}`
- **Configuration**:
  - `unit`: String (e.g., "px")
  - `field`: String (label for the value field)
- **Behavior**:
  - 3 Rows (Desktop, Tablet, Mobile).
  - Row contains: Icon + Input Field.
  - Icons: 💻 (Desktop), 📱 (Tablet), 📱 (Mobile).
  - **Inheritance Logic**: If Tablet or Mobile value is `null` or empty, the input is disabled, and the row shows "Inherits Desktop".
  - Clicking the icon toggles the "Override" state (Inherits <-> Custom).
  - `onChange` emits `{desktop, tablet, mobile}`.

## DOM Structure
- Container
  - Row 1: Desktop (Icon + Input)
  - Row 2: Tablet (Icon + Input)
  - Row 3: Mobile (Icon + Input)