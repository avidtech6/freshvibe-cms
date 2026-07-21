# Codex: Dimension Implementation

## Tech Stack
- Vanilla JS
- CSS Grid/Flex
- Shared Value State Logic

## Logic: Link/Unlink
1. Maintain a "shared" value when linked.
2. When Link is OFF and an input changes, store that specific input's value.
3. When Link is ON and input changes, broadcast value to all inputs.

## Logic: Value Emission
- Throttle emissions to avoid spamming if focus remains inside an input.
- Emit complete object `{top, right, bottom, left}` on every valid change.