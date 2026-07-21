/**
 * Textarea Control Module
 * Renders an auto-resizing textarea.
 */
export function render(field, value, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-textarea';

  const {
    rows = 3,
    placeholder = '',
    maxLength,
  } = field.props || {};

  const textarea = document.createElement('textarea');
  textarea.rows = rows;
  textarea.value = value || '';
  textarea.placeholder = placeholder;
  if (maxLength) textarea.maxLength = maxLength;

  const MAX_HEIGHT = 150;
  let debounceTimer;

  function autoResize() {
    // Reset to measure content
    textarea.style.height = 'auto';
    const newHeight = textarea.scrollHeight;
    
    // Clamp height
    if (newHeight > MAX_HEIGHT) {
      textarea.style.height = `${MAX_HEIGHT}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  }

  function handleInput(e) {
    autoResize();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onChange(e.target.value);
    }, 300);
  }

  textarea.addEventListener('input', handleInput);

  // Init height
  autoResize();

  container.appendChild(textarea);

  return container;
}