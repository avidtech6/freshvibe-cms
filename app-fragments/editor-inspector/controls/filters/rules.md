# Rules: Filter UX

1. **Constraint:** Opacity cannot exceed 100% logically, though CSS allows 0-1.
2. **Range:** Blur limited to 50px to prevent UI scrolling issues.
3. **Visuals:** The preview box in the inspector must have the actual filters applied (`filter: val`).
4. **Inputs:** Suffix units (px, %) should be visible or strongly implied.