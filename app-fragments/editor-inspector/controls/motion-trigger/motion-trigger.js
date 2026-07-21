const options = [
  { id: 'load', label: 'On Page Load', icon: '🏠' },
  { id: 'scroll', label: 'On Scroll', icon: '📜' },
  { id: 'hover', label: 'On Hover', icon: '👆' },
  { id: 'click', label: 'On Click', icon: '⚡' }
];

export function render(field, value, onChange) {
  const container = document.createElement('div');
  container.className = 'fes-motion-trigger';

  const pills = document.createElement('div');
  pills.className = 'fes-pills';

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `fes-pill ${value === opt.id ? 'fes-active' : ''}`;
    btn.innerHTML = `<span class="fes-icon">${opt.icon}</span> <span class="fes-label">${opt.label}</span>`;

    btn.addEventListener('click', () => {
      onChange(opt.id);
      render();
    });

    pills.appendChild(btn);
  });

  container.appendChild(pills);
  return container;
}