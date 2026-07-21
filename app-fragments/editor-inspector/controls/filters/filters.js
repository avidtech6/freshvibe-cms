const config = [
  { key: 'blur', label: 'Blur', unit: 'px', min: 0, max: 50, step: 0.5 },
  { key: 'brightness', label: 'Bright', unit: '%', min: 0, max: 200, step: 1 },
  { key: 'contrast', label: 'Contrast', unit: '%', min: 0, max: 200, step: 1 },
  { key: 'saturate', label: 'Saturate', unit: '%', min: 0, max: 200, step: 1 },
  { key: 'opacity', label: 'Opacity', unit: '%', min: 0, max: 100, step: 1 }
];

export function render(field, value, onChange) {
  const container = document.createElement('div');
  container.className = 'fes-filters';

  const previewBox = document.createElement('div');
  previewBox.className = 'fes-filter-preview';
  previewBox.textContent = '✦';
  previewBox.style.filter = getFilterString(value);
  previewBox.style.backgroundColor = 'var(--panel-2)';
  previewBox.style.borderRadius = '50%';
  previewBox.style.width = '60px';
  previewBox.style.height = '60px';
  previewBox.style.display = 'flex';
  previewBox.style.alignItems = 'center';
  previewBox.style.justifyContent = 'center';
  previewBox.style.margin = '0 auto 16px';

  const filterGrid = document.createElement('div');
  filterGrid.className = 'fes-filter-grid';

  config.forEach(item => {
    const row = document.createElement('div');
    row.className = 'fes-filter-row';

    const label = document.createElement('span');
    label.className = 'fes-label';
    label.textContent = item.label;

    const valDisplay = document.createElement('span');
    valDisplay.className = 'fes-value';
    valDisplay.textContent = `${value[item.key]}${item.unit}`;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = item.min;
    input.max = item.max;
    input.step = item.step;
    input.value = value[item.key];

    input.addEventListener('input', () => {
      const newValue = { ...value, [item.key]: input.value };
      onChange(newValue, getFilterString(newValue));
      valDisplay.textContent = `${input.value}${item.unit}`;
      previewBox.style.filter = getFilterString(newValue);
    });

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(valDisplay);
    filterGrid.appendChild(row);
  });

  const resetBtn = document.createElement('button');
  resetBtn.className = 'fes-btn-secondary';
  resetBtn.textContent = 'Reset';
  resetBtn.onclick = () => {
    const defaults = config.reduce((acc, c) => ({...acc, [c.key]: c.min}), {});
    onChange(defaults, getFilterString(defaults));
    render(); // Re-render values
  };

  container.appendChild(previewBox);
  container.appendChild(filterGrid);
  container.appendChild(resetBtn);

  return container;
}

function getFilterString(val) {
  const parts = [];
  if (val.blur) parts.push(`blur(${val.blur}px)`);
  if (val.brightness) parts.push(`brightness(${val.brightness}%)`);
  if (val.contrast) parts.push(`contrast(${val.contrast}%)`);
  if (val.saturate) parts.push(`saturate(${val.saturate}%)`);
  if (val.opacity) parts.push(`opacity(${val.opacity}%)`);
  return parts.join(' ');
}