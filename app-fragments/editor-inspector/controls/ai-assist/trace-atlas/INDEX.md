# Trace Atlas: AI Assist

## Component Hierarchy
```
AIContainer
└── MainBtn
    └── Modal
        ├── OptionRow
        │   └── OptionBtn (Spinner)
        ├── ResultArea (Textarea)
        └── ApplyBtn
```

## Events
- `click` MainBtn -> Show Modal.
- `click` OptionBtn -> Set loading -> Set value -> Show Result.
- `click` ApplyBtn -> Trigger parent onChange.