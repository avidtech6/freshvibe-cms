# Development Plan
1. Create container div.
2. Loop through initial `value` array, create tag elements.
3. Create input element at the end.
4. Bind 'keydown' to input: Enter/Comma -> push to array, re-render.
5. Bind 'input' to input: monitor value.
6. Bind 'click' to tag close buttons: pop from array, re-render.
7. Bind 'keydown' (Backspace) on empty input: pop last.