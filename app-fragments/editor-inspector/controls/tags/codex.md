# CODEX: Tags Implementation

## Principles
1. **Performance**: Virtualization is not needed for small sets (< 50 tags), direct DOM manipulation is faster.
2. **UX**: Clear distinction between edit mode and view mode.
3. **Input Handling**: Must distinguish between typing a new tag and deleting an existing one.

## State Management
- `tags`: Internal copy of the array.
- `inputValue`: String buffer.