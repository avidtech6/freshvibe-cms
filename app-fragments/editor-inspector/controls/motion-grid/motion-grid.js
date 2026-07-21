export function render(field, value, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-motion-grid';
  const columns = field.columns || 3;
  
  // Defaults
  const options = field.options || [
    { "value": "fade-up", "label": "Fade Up", "icon": "▶" },
    { "value": "slide", "label": "Slide", "icon": "←→" },
    { "value": "scale", "label": "Scale", "icon": "↔" },
    { "value": "rotate", "label": "Rotate", "icon": "↻" },
    { "value": "reveal", "label": "Reveal", "icon": "⟳" },
    { "value": "none", "label": "None", "icon": "—" }
  ];

  const style = document.createElement('style');
  style.textContent = `
    :root { --bg: #0b0d11; --panel: #14181f; --panel-2: #1a1f27; --border: #2a3038;
      --text: #e6e9ef; --text-mid: #b8bfca; --accent: #7cf0a0; --accent-2: #5fa8ff;
      --r-sm: 4px; --r-md: 6px; }
    .fes-control-motion-grid {
      display: grid; grid-template-columns: repeat(${columns}, 1fr);
      gap: 12px;
    }
    .fes-tile {
      aspect-ratio: 1.4;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-dim);
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }
    .fes-tile:hover { background: var(--panel-2); border-color: var(--text-dim); }
    .fes-tile.active { border-color: var(--accent); color: var(--accent); }
    .fes-tile-icon { font-size: 18px; margin-bottom: 6px; }
    .fes-tile-label { font-size: 11px; text-transform: uppercase; font-weight: 600; }
    .fes-tile.active .fes-tile-label { color: var(--accent); }
  `;
  container.appendChild(style);

  options.forEach(opt => {
    const tile = document.createElement('div');
    tile.className = `fes-tile ${opt.value === value ? 'active' : ''}`;
    
    const icon = document.createElement('div');
    icon.className = 'fes-tile-icon';
    icon.textContent = opt.icon || '';
    
    const label = document.createElement('div');
    label.className = 'fes-tile-label';
    label.textContent = opt.label;

    tile.appendChild(icon);
    tile.appendChild(label);

    tile.onclick = () => {
      if (opt.value !== value) {
        onChange(opt.value);
      }
    };

    container.appendChild(tile);
  });

  return container;
}