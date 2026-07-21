# DNA: Shadow Logic

**Hydration Strategy:** Ensure inputs are stringified integers.

**Validation:** Prevent deleting the last layer. Allow empty blur/opacity fields (zero value).

**Color Handling:** Use `rgba` strings. Convert hex to rgba if needed (native color picker usually provides rgba in modern browsers).

**Performance:** Re-render only the specific row being edited, or the whole list if simpler. For < 5 layers, full list re-render is negligible.