const options = [
  { id: 'fade-up', label: 'Fade Up', icon: '✦' },
  { id: 'slide', label: 'Slide', icon: '⇧' },
  { id: 'scale', label: 'Scale', icon: '⤢' },
  { id: 'rotate', label: 'Rotate', icon: '↻' },
  { id: 'reveal', label: 'Reveal', icon: '👁' },
  { id: 'none', label: 'None', icon: '–' }
];

export function render(field, value, onChange) {
  const container = document.createElement('div');
  container.className = 'fes-motion-entrance';

  const grid = document.createElement('div');
  grid.className = 'fes-grid-2x3';

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `fes-tile ${value === opt.id ? 'fes-active' : ''}`;
    btn.innerHTML = `<span class="fes-icon">${opt.icon}</span><span class="fes-label">${opt.label}</span>`;

    btn.addEventListener('click', () => {
      onChange(opt.id);
      render();
    });

    grid.appendChild(btn);
  });

  container.appendChild(grid);
  return container;
}