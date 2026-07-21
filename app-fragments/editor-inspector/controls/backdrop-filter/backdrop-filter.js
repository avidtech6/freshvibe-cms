const presets = [
  { label: 'Blur 8px', value: 'blur(8px)' },
  { label: 'Blur 16px', value: 'blur(16px)' },
  { label: 'Saturate 180%', value: 'saturate(180%)' },
  { label: 'Grayscale', value: 'grayscale(100%)' }
];

export function render(field, value, onChange) {
  const container = document.createElement('div');
  container.className = 'fes-backdrop';

  const grid = document.createElement('div');
  grid.className = 'fes-preset-grid';

  presets.forEach(p => {
    const btn = document.createElement('button');
    btn.className = `fes-pill ${value === p.value ? 'fes-active' : ''}`;
    btn.textContent = p.label;

    btn.addEventListener('click', () => {
      onChange(p.value);
      render(); // Re-render to update active class
    });

    grid.appendChild(btn);
  });

  // Add "None" option
  const noneBtn = document.createElement('button');
  noneBtn.className = `fes-pill ${value === 'none' ? 'fes-active' : ''}`;
  noneBtn.textContent = 'None';
  noneBtn.addEventListener('click', () => {
    onChange('none');
    render();
  });
  grid.appendChild(noneBtn);

  container.appendChild(grid);
  return container;
}