export function render(field, value, onChange, adapter) {
  const config = field.config || {};
  const unit = config.unit || "px";

  // Normalize value object
  const v = value || { tl: "", tr: "", br: "", bl: "" };

  const container = document.createElement('div');
  container.className = 'fes-control-radius fes-control-group';
  container.style.marginBottom = '8px';

  // Create a 2x2 Grid
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  grid.style.gap = '4px';
  grid.style.width = '100%';

  const corners = [
    { id: 'tl', label: 'TL' },
    { id: 'tr', label: 'TR' },
    { id: 'br', label: 'BR' },
    { id: 'bl', label: 'BL' }
  ];

  corners.forEach(corner => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '2px';

    const label = document.createElement('span');
    label.textContent = corner.label;
    label.style.fontSize = '10px';
    label.style.color = 'var(--text-dim)';
    label.style.fontWeight = '600';

    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = '0';
    input.className = 'fes-radius-input';
    input.dataset.key = corner.id;
    input.style.width = '32px';
    input.style.height = '26px';
    input.style.textAlign = 'center';
    input.style.background = 'var(--panel-2)';
    input.style.border = '1px solid var(--border)';
    input.style.color = 'var(--text)';
    input.style.fontSize = '11px';
    input.style.fontFamily = 'monospace';
    input.style.borderRadius = 'var(--r-sm)';
    input.value = v[corner.id] !== undefined ? v[corner.id] : '';

    input.addEventListener('input', (e) => {
      const val = e.target.value;
      const valNum = val === '' ? '' : parseFloat(val);
      v[corner.id] = valNum;
      onChange(v);
    });
    
    input.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') input.blur();
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    grid.appendChild(wrapper);
  });

  container.appendChild(grid);
  return container;
}