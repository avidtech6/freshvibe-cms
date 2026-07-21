/**
 * Text Control Module
 * Renders a floating label text input.
 */
export function render(field, value, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-text';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.placeholder = ' '; // Placeholder needed for CSS technique
  input.maxLength = field.props.maxLength;
  
  // Apply pattern if provided
  if (field.props.pattern) {
    input.pattern = field.props.pattern;
  }

  const label = document.createElement('label');
  label.textContent = field.props.placeholder || 'Label';
  label.setAttribute('for', input.id || Math.random().toString(36).substr(2, 9));

  let debounceTimer;

  // Float label logic
  function updateFloatState() {
    const hasValue = input.value.length > 0;
    const isFocused = document.activeElement === input;
    if (hasValue || isFocused) {
      label.classList.add('floating');
    } else {
      label.classList.remove('floating');
    }
  }

  // Event Listeners
  input.addEventListener('focus', updateFloatState);
  input.addEventListener('blur', updateFloatState);
  input.addEventListener('input', (e) => {
    updateFloatState();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onChange(e.target.value);
    }, 300);
  });

  container.appendChild(label);
  container.appendChild(input);

  return container;
}