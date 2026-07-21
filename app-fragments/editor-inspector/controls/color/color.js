export function render(field, value, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-color';

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --bg: #0b0d11; --panel: #14181f; --panel-2: #1a1f27;
      --border: #2a3038; --text: #e6e9ef; --text-mid: #b8bfca;
      --text-dim: #7a8290; --accent: #7cf0a0; --accent-2: #5fa8ff;
      --r-sm: 4px; --r-md: 6px; }
    .fes-control-color { display: flex; align-items: center; gap: 8px; }
    .fes-swatch {
      width: 30px; height: 28px; border: 1px solid var(--border);
      background-color: ${value}; cursor: pointer; border-radius: var(--r-sm);
      flex-shrink: 0; transition: transform 0.1s;
    }
    .fes-swatch:hover { transform: scale(1.05); border-color: var(--accent); }
    .fes-input {
      background: var(--bg); border: 1px solid var(--border); color: var(--text);
      padding: 4px 8px; font-family: monospace; font-size: 13px;
      border-radius: var(--r-sm); width: 100px;
    }
    .fes-input:focus { outline: none; border-color: var(--accent-2); }
    .fes-slider {
      -webkit-appearance: none; width: 100px; height: 4px;
      background: var(--bg); border-radius: 2px; outline: none;
    }
    .fes-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%;
      background: var(--accent-2); cursor: pointer; border: 2px solid var(--panel);
    }
  `;
  container.appendChild(style);

  // State
  const state = { value: value || '#000000' };
  
  // Swatch
  const swatch = document.createElement('div');
  swatch.className = 'fes-swatch';
  swatch.onclick = () => {
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = state.value;
    picker.oninput = (e) => {
      state.value = e.target.value;
      input.value = state.value;
      swatch.style.backgroundColor = state.value;
      onChange(state.value);
    };
    picker.onblur = () => picker.remove();
    document.body.appendChild(picker);
    picker.click();
    picker.focus();
  };

  // Input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'fes-input';
  input.value = state.value;
  
  // Regex for 6 or 8 hex
  const hexRegex = /^#?([0-9A-F]{6}|[0-9A-F]{8})$/i;
  
  input.oninput = (e) => {
    let val = e.target.value;
    // Auto-prepend # if missing
    if (val && !val.startsWith('#')) val = '#' + val;
    
    if (hexRegex.test(val)) {
      state.value = val;
      swatch.style.backgroundColor = val;
      onChange(val);
    }
  };

  container.appendChild(swatch);
  container.appendChild(input);

  // Alpha Slider
  if (field.showAlpha) {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'fes-slider';
    slider.min = 0;
    slider.max = 100;
    slider.value = 100;
    
    slider.oninput = (e) => {
      let base = state.value;
      if (base.length === 7) base += 'FF';
      
      let r = parseInt(base.substring(1, 3), 16);
      let g = parseInt(base.substring(3, 5), 16);
      let b = parseInt(base.substring(5, 7), 16);
      
      let a = parseInt(e.target.value) / 100;
      let newHex = '#' + ((1 << 24) + (Math.round(r * a) << 16) + (Math.round(g * a) << 8) + Math.round(b * a)).toString(16).slice(1);
      
      state.value = newHex;
      input.value = newHex;
      swatch.style.backgroundColor = newHex;
      onChange(newHex);
    };

    container.appendChild(slider);
  }

  return container;
}