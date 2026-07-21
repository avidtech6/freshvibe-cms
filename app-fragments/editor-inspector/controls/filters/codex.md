# Codex: Filter Logic

## Configuration
Filters are normalized:
- `blur`: px
- `brightness`, `contrast`, `saturate`, `opacity`: %

## Default Value
```json
{
  "blur": 0,
  "brightness": 100,
  "contrast": 100,
  "saturate": 100,
  "opacity": 100
}
```

## Normalization Helper
```javascript
const config = [
  { key: 'blur', label: 'Blur', unit: 'px', min: 0, max: 50, step: 0.5 },
  { key: 'brightness', label: 'Bright', unit: '%', min: 0, max: 200, step: 1 },
  { key: 'contrast', label: 'Contrast', unit: '%', min: 0, max: 200, step: 1 },
  { key: 'saturate', label: 'Saturate', unit: '%', min: 0, max: 200, step: 1 },
  { key: 'opacity', label: 'Opacity', unit: '%', min: 0, max: 100, step: 1 }
];