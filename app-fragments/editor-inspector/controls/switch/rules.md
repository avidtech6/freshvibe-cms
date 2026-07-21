# Rules: Styling & Interaction

### Visual Rules
1. **Track**: Round pill shape. Height 24px. Width 44px. Radius 12px. Background: `--panel-2` (off), `var(--accent)` (on).
2. **Thumb**: Round circle. Size 20px. Radius 50%. Background `--text-mid` (off), `#fff` (on).
3. **Label**: Text left of switch. Color `--text`.
4. **Position**: Flex row.
5. **Focus**: Outline `1px solid var(--accent-2)` on track when focused.

### Interaction Rules
1. **Touch Target**: Ensure 44x44px minimum clickable area (Track).
2. **Animation**: CSS `transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)`.
3. **Shift Key**: Allow Shift+Click to toggle? (Usually unnecessary, but allowed).