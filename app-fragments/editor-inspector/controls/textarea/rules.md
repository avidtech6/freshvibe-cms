# Rules: Styling & Interaction

### Visual Rules
1. **Wrapper**: Border-bottom only. No box background.
2. **Input**: Padding 8px 0.
3. **Focus**: Border color `--accent-2`.
4. **Max Height**: If exceeds height, hide scrollbars or show them?
   - Rule: "Auto-resize to content".
   - Constraint: "Show scroll if needed".
   - Implementation: `max-height: 150px; overflow-y: auto;`.