export function render(field, value, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-bg-tabs';
  
  const options = field.options || [
    { "value": "none", "label": "None", "icon": "▢" },
    { "value": "color", "label": "Color", "icon": "●" },
    { "value": "gradient", "label": "Gradient", "icon": "▦" },
    { "value": "image", "label": "Image", "icon": "▢" },
    { "value": "video", "label": "Video", "icon": "▶" }
  ];

  const style = document.createElement('style');
  style.textContent = `
    :root { --bg: #0b0d11; --panel: #14181f; --panel-2: #1a1f27; --border: #2a3038;
      --text: #e6e9ef; --text-mid: #b8bfca; --accent: #7cf0a0; --accent-2: #5fa8ff;
      --r-sm: 4px; --r-md: 6px; }
    .fes-control-bg-tabs { display: flex; width: 100%; border-bottom: 1px solid var(--border); }
    .fes-tab {
      flex: 1; display: flex; align-items: center; justify-content: center;
      padding: 10px 0; cursor: pointer; color: var(--text-dim); font-size: 11px;
      text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s;
      position: relative;
    }
    .fes-tab:hover { color: var(--text); }
    .fes-tab.active { color: var(--text); background-color: var(--panel-2); }
    .fes-tab-icon { margin-right: 6px; font-size: 12px; }
    .fes-tab.active .fes-tab-icon { color: var(--accent-2); }
  `;
  container.appendChild(style);

  options.forEach(opt => {
    const tab = document.createElement('div');
    tab.className = `fes-tab ${opt.value === value ? 'active' : ''}`;
    
    const icon = document.createElement('span');
    icon.className = 'fes-tab-icon';
    icon.textContent = opt.icon || '';
    
    const label = document.createElement('span');
    label.textContent = opt.label;

    tab.appendChild(icon);
    tab.appendChild(label);

    tab.onclick = () => {
      if (opt.value !== value) {
        onChange(opt.value);
      }
    };

    container.appendChild(tab);
  });

  return container;
}