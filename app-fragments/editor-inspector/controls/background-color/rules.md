# Rules: Validation & Constraints

1. **Hex Length:** Input must be exactly 7 characters (e.g., `#ffffff`). Regex: `/^#([0-9A-Fa-f]{6})$/`.
2. **Alpha Range:** Slider must clamp between 0.0 and 1.0.
3. **Zero Values:** `#000000` is allowed. `#00000000` implies fully transparent.
4. **Invalid Hex:** If user types invalid characters, do not update the preview; show error state or simply ignore.
5. **Leading Zero:** Ensure Hex inputs display with leading zeros (e.g., `#00FF00`).