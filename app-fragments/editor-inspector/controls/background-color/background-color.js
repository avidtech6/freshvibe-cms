// === background-color.js ===

export function render(field, value = { hex: '#000000', alpha: 1 }, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-bg-color';
  
  // Helper to build elements
  const el = (tag, cls = '') => {
    const t = document.createElement(tag);
    if(cls) t.className = cls;
    return t;
  };

  // 1. Preview Swatch
  const swatchContainer = el('div', 'fes-swatch-wrap');
  const swatch = el('div', 'fes-swatch');
  swatch.style.background = `rgba(${parseInt(value.hex.slice(1,3),16)}, ${parseInt(value.hex.slice(3,5),16)}, ${parseInt(value.hex.slice(5,7),16)}, ${value.alpha})`;
  swatchContainer.appendChild(swatch);

  // 2. Hex Input
  const label = el('label', 'fes-label');
  label.textContent = field.label || 'Color';
  const hexInput = el('input', 'fes-input');
  hexInput.type = 'text';
  hexInput.value = value.hex;
  hexInput.maxLength = 7;
  hexInput.placeholder = '#000000';

  // 3. Alpha Slider (Conditional)
  const alphaContainer = el('div', 'fes-alpha-wrap');
  if (field.showAlpha !== false) {
    const slider = el('input', 'fes-slider');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 1;
    slider.step = 0.01;
    slider.value = value.alpha;
    
    // Update logic
    slider.addEventListener('input', (e) => {
      const newAlpha = parseFloat(e.target.value);
      // Update hex string to include alpha if needed, or keep simple
      // For this v8 control, we keep hex clean and pass alpha separately or merged
      // Keeping simple: update hex for simple state, but logic expects object structure usually
      // For this specific requirement "value" is Hex, we'll normalize on change.
      onChange({ ...value, alpha: newAlpha, hex: updateHexWithAlpha(value.hex, newAlpha) });
    });

    const alphaVal = el('span', 'fes-alpha-val');
    alphaVal.textContent = Math.round(value.alpha * 100) + '%';
    alphaContainer.appendChild(slider);
    alphaContainer.appendChild(alphaVal);
  }

  // Hex Change Logic
  hexInput.addEventListener('input', (e) => {
    let hex = e.target.value;
    if (hex.startsWith('#')) hex = hex.slice(1);
    
    // Basic validation
    if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      swatch.style.background = `rgba(${r}, ${g}, ${b}, ${value.alpha})`;
      onChange({ hex, alpha: value.alpha });
    }
  });

  container.appendChild(label);
  container.appendChild(swatchContainer);
  container.appendChild(hexInput);
  container.appendChild(alphaContainer);

  return container;
}

// Internal helper to rebuild hex string if alpha changes significantly
// Simplified for this snippet: returns original hex
function updateHexWithAlpha(hex, alpha) {
  // Real implementation would convert rgba back to hex+alpha
  return hex;
}