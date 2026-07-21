# DNA: Textarea Control

## Monolith
Render function returning a flex container holding a textarea.

## JS Strategy
Simple CSS height calculation.
```javascript
textarea.style.height = 'auto';
textarea.style.height = textarea.scrollHeight + 'px';