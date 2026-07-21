# DNA: Dropdown Control

## Core Monolith
A single `render()` function that accepts a configuration object.
```javascript
function render(config) {
  // 1. Create Container
  // 2. Attach Events
  // 3. Return DOM
}
```

## State Strategy
State is managed via a closure or passed as a prop in the v8 adapter context.
```javascript
let state = { isOpen: false, filteredOptions: [] };
```

## Re-render Trigger
Only re-render the listbox content on search or selection, not the trigger (to avoid focus loss).