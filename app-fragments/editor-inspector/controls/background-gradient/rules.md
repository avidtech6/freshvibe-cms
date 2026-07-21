# Rules: Gradient Constraints

1. **Stops:** Minimum 2 stops (even if same color), Maximum 5 stops.
2. **Type:**
   - `none`: No gradient, returns `{ type: 'none' }`.
   - `linear`: Requires angle.
   - `radial`: No angle.
   - `conic`: No angle.
3. **Position:** Must be 0% or 100% if it is the first or last stop (optional, but good UX). Minimum distance between adjacent stops.
4. **Colors:** Valid CSS colors only.