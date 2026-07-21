# Codex: Shadow Layer Composition Logic

## Structure
The internal state is an array of objects. Each object maps directly to the CSS `box-shadow` syntax parts (excluding the prefix "box-shadow: ").

## Default State
On first load, initialize with one layer:
```json
{
  "x": 0,
  "y": 0,
  "blur": 0,
  "spread": 0,
  "color": "rgba(0, 0, 0, 1)",
  "inset": false
}
```

## Value Transformation
When `onChange` is called, join all layers:
```javascript
layers.map(l => {
  const inset = l.inset ? 'inset ' : '';
  const color = l.color;
  const shadow = `${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${color}`;
  return inset ? `inset ${shadow}` : shadow;
}).join(', ');