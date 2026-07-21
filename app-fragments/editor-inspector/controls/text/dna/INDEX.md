# DNA: Text Control

## Monolith
Single render function returning the input and label structure.

## CSS Strategy
Use standard CSS Transitions on the Label element.
```css
label { transition: transform 0.2s, font-size 0.2s, color 0.2s; }
label.floating { transform: translateY(-1.5em) scale(0.85); }
```

## JS Strategy
Debounce helper outside the render function scope to handle the timing.