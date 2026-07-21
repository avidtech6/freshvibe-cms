# Data Flow Trace

**Mock Data:**
```js
[
  { id: 1, url: '...', title: 'Forest Path' },
  { id: 2, url: '...', title: 'Classroom' }
]
```

**Render Cycle:**
1. Render Search Input.
2. Render Category Chips (active state defaults to 'Curated').
3. Render Grid (2 cols).

**Interaction (Search):**
1. User types 'green'.
2. Filter mock data for 'green'.
3. Re-render Grid.

**Interaction (Click):**
1. User clicks image ID 1.
2. Call `onChange({ url: ... })`.