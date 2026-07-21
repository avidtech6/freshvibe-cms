# DNA: Switch Control

## Monolith
Render function returning a label (if present) and the Switch container.

## CSS Strategy
Toggle state is managed by a single class (e.g., `.active`) on the track or thumb. We will toggle a class on the parent switch container.

```css
.switch input { display: none; }
.track { transform: translateX(...) }
.track.active .thumb { transform: translateX(20px); } /* Example logic */
```

Actually, calculating exact pixels in CSS is brittle. Better to change transform of thumb directly via JS on toggle, or use a checked boolean class.