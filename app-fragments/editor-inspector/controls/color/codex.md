# CODEX: Color Implementation

## Principles
1. **Hybrid Interaction**: Combine native picker for convenience with manual entry for precision.
2. **Transparency**: Treat 8-char hex as the source of truth for alpha state.
3. **Validation**: Regex validation should be strict.

## Architecture
- `render`: Creates DOM nodes.
- `update`: Reacts to internal state (hex/alpha changes).
- `normalize`: Converts between 0-100 slider and AA hex value.

## Utilities
- `isValidHex(hex)`: Regex check.
- `hexToRgb(hex)`: For alpha calculation.