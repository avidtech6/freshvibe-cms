# Recipe: iOS-Style Toggle Switch

**Version:** v8.0.0
**Type:** Form Control
**Status:** Stable

### Objective
Implement a boolean toggle control resembling iOS style sliders.

### Functional Requirements
1. **Toggle**: A movable handle (thumb) inside a track.
2. **State**:
   - False: Track is dark/grey. Thumb left.
   - True: Track is green/tint. Thumb right.
3. **Interaction**:
   - Clicking the track or thumb toggles the state.
   - Dragging (optional but good for UX): Updates state while dragging (simulated or real). Here we stick to click/tap for simplicity in vanilla JS unless specified otherwise. We will use click/tap logic.
4. **Accessibility**: Needs `role="switch"`, `aria-checked`, and `tabindex="0"`.

### Sub-controls
- `value` (Boolean).
- `label` (String): Text label displayed next to the toggle.