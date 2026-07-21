export function render(field, value, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-pills';
  const options = field.options || [];
  const selectedValue = value;

  const style = document.createElement('style');
  style.textContent = `
    :root { --bg: #0b0d11; --panel: #14181f; --panel-2: #1a1f27; --border: #2a3038;
      --text: #e6e9ef; --text-mid: #b8bfca; --accent: #7cf0a0; --accent-2: #5fa8ff;
      --r-sm: 4px; --r-md: 6px; }
    .fes-control-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .fes-pill {
      background: var(--panel); border: 1px solid var(--border); color: var(--text-mid);
      border-radius: var(--r-md); padding: 6px 12px; font-size: 12px; cursor: pointer;
      display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .fes-pill:hover { border-color: var(--text-dim); color: var(--text); }
    .fes-pill.active { background: var(--accent-2); color: #fff; border-color: var(--accent-2); }
    .fes-pill svg { width: 14px; height: 14px; }
  `;
  container.appendChild(style);

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `fes-pill ${opt.value === selectedValue ? 'active' : ''}`;
    btn.type = 'button';
    btn.ariaPressed = opt.value === selectedValue;
    
    // Label
    const label = document.createElement('span');
    label.textContent = opt.label;
    btn.appendChild(label);

    // Icon if exists
    if (opt.icon) {
      const icon = document.createElement('div');
      icon.innerHTML = opt.icon; // Assumes SVG string
      btn.appendChild(icon);
    }

    btn.onclick = () => {
      if (opt.value !== selectedValue) {
        onChange(opt.value);
      }
    };

    container.appendChild(btn);
  });

  return container;
}