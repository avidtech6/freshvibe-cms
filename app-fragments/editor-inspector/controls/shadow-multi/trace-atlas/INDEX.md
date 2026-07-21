# Trace Atlas: Shadow Multi

## Component Hierarchy
```
ShadowMultiContainer
├── ShadowPreview (Center Box)
├── LayerList (Scrollable Area)
│   ├── LayerRow (x 1..N)
│   │   ├── Input (x)
│   │   ├── Input (y)
│   │   ├── Input (blur)
│   │   ├── Input (spread)
│   │   ├── ColorInput
│   │   ├── InsetCheckbox
│   │   └── RemoveBtn
│   └── AddLayerBtn
```

## Events
- `change` on inputs -> triggers `onChange` with updated array.
- `click` on Add/Remove -> triggers `onChange`.