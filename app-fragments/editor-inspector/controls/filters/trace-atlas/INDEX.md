# Trace Atlas: Filters

## Component Hierarchy
```
FiltersContainer
├── FilterPreview (Circle/Box with CSS filter applied)
├── FilterGrid (5 Rows)
│   └── FilterRow
│       ├── Label
│       ├── RangeInput
│       └── ValueDisplay
└── ResetBtn
```

## Events
- `input` on sliders -> triggers `onChange` with updated object.
- `click` on Reset -> triggers `onChange` with default state.