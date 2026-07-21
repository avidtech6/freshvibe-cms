/**
 * Number Control Module
 * Renders a stepper input.
 */
export function render(field, value, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-number';

  const {
    min = -Infinity,
    max = Infinity,
    step = 1,
    unit = ''
  } = field.props || {};

  let currentVal = Number(value) || 0;

  const input = document.createElement('input');
  input.type = 'text';
  input.readOnly = true;
  input.value = formatValue(currentVal, unit);
  input.className = 'fes-number-input';

  const btnMinus = document.createElement('button');
  btnMinus.className = 'fes-number-btn';
  btnMinus.textContent = '-';
  btnMinus.title = 'Decrement (Shift + Click for 10x)';

  const btnPlus = document.createElement('button');
  btnPlus.className = 'fes-number-btn';
  btnPlus.textContent = '+';
  btnPlus.title = 'Increment (Shift + Click for 10x)';

  function formatValue(num, u) {
    return `${Math.round(num * 100) / 100}${u}`;
  }

  function update(val) {
    currentVal = val;
    input.value = formatValue(currentVal, unit);
    onChange(currentVal);
  }

  function clamp(num) {
    return Math.min(Math.max(num, min), max);
  }

  function handleStep(e) {
    e.preventDefault();
    e.stopPropagation();
    const isShift = e.shiftKey;
    const delta = isShift ? step * 10 : step;
    const change = e.target === btnMinus ? -delta : delta;
    const newVal = clamp(currentVal + change);
    update(newVal);
  }

  btnMinus.addEventListener('mousedown', handleStep);
  btnPlus.addEventListener('mousedown', handleStep);

  // Prevent double firing on some browsers, rely on mousedown for speed
  btnMinus.addEventListener('click', (e) => e.preventDefault()); 
  btnPlus.addEventListener('click', (e) => e.preventDefault());

  container.appendChild(input);
  container.appendChild(btnMinus);
  container.appendChild(btnPlus);

  return container;
}