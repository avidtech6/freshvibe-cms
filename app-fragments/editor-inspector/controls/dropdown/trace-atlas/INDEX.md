# Trace Atlas: Dropdown

| Feature | ID | Source | Target | Method |
|---------|----|--------|--------|--------|
| Render Trigger | `DWN-01` | Component | DOM (Button) | `document.createElement` |
| Toggle Listbox | `DWN-02` | Click | State (`isOpen`) | Toggle Boolean |
| Filter Options | `DWN-03` | Input | Array `filter()` | Filter Event |
| Select Value | `DWN-04` | Click | Prop `value` | `onChange` Callback |
| Close On Escape | `DWN-05` | Keydown | State (`isOpen`) | KeyDown Event |