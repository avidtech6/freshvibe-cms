# Codex: AI Logic

## Mock Response
Since no backend exists, use `setTimeout` and a static string array.

```javascript
const responses = {
  'improve': 'Enhanced copy: The product has been improved for clarity and engagement.',
  'brand': 'Brand Match: Tone adjusted to align with corporate guidelines.',
  'alt': 'Alt Text: A high-quality image of a modern architectural structure.',
  'heading': 'Heading: Unlock the Future of Design Today.'
};
```

## State Flow
1. Click Option -> Set `loading = true`.
2. Wait 1500ms.
3. Set `value = response`, `loading = false`.
4. Render Modal.