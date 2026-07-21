# Codex: Backdrop Logic

## Presets
```javascript
const presets = [
  { label: 'Blur 8px', value: 'blur(8px)' },
  { label: 'Blur 16px', value: 'blur(16px)' },
  { label: 'Saturate 180%', value: 'saturate(180%)' },
  { label: 'Grayscale', value: 'grayscale(100%)' }
];
```

## Special Case
Value `'none'` is valid and clears filters.