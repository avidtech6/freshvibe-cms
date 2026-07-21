/**
 * Switch Control Module
 * Renders an iOS-style toggle.
 */
export function render(field, value, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-switch';

  const isChecked = Boolean(value);

  const track = document.createElement('div');
  track.className = 'fes-switch-track';
  track.setAttribute('role', 'switch');
  track.setAttribute('aria-checked', isChecked);
  track.setAttribute('tabindex', '0');
  track.setAttribute('aria-label', field.props.label || 'Toggle');

  const thumb = document.createElement('div');
  thumb.className = 'fes-switch-thumb';

  // Init styles
  updateThumbPosition();

  function updateThumbPosition() {
    if (isChecked) {
      track.classList.add('fes-switch-active');
    } else {
      track.classList.remove('fes-switch-active');
    }
  }

  function toggle(e) {
    if (e) e.preventDefault(); // Prevent focus loss
    isChecked = !isChecked;
    updateThumbPosition();
    track.setAttribute('aria-checked', isChecked);
    onChange(isChecked);
  }

  track.addEventListener('click', toggle);
  track.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      toggle(e);
    }
  });

  container.appendChild(track);
  container.appendChild(thumb);

  return container;
}