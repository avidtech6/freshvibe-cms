export function render(field, value, onChange, adapter) {
  const config = field.config || {};
  const unit = config.unit || "px";
  const label = config.field || "Width";

  // Normalize value object
  const v = value || { desktop: "", tablet: "", mobile: "" };
  
  // State for overrides
  const override = { tablet: false, mobile: false };

  const container = document.createElement('div');
  container.className = 'fes-control-responsive';
  container.style.marginBottom = '8px';

  const rows = [
    { id: 'desktop', label: 'Desktop', icon: '💻', isDesktop: true },
    { id: 'tablet', label: 'Tablet', icon: '📱' },
    { id: 'mobile', label: 'Mobile', icon: '📱' }
  ];

  rows.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'fes-resp-row';
    rowEl.style.display = 'flex';
    rowEl.style.alignItems = 'center';
    rowEl.style.marginBottom = '6px';

    // Icon Container
    const iconContainer = document.createElement('div');
    iconContainer.style.display = 'flex';
    iconContainer.style.alignItems = 'center';
    iconContainer.style.justifyContent = 'center';
    iconContainer.style.width = '24px';
    iconContainer.style.marginRight = '8px';
    iconContainer.style.cursor = 'pointer';
    iconContainer.title = 'Click to toggle override';

    // Icon Text
    const iconEl = document.createElement('span');
    iconEl.textContent = row.icon;
    iconEl.style.fontSize = '16px';
    
    // Inheritance Text
    const inheritText = document.createElement('span');
    inheritText.textContent = 'Inherits Desktop';
    inheritText.style.fontSize = '11px';
    inheritText.style.color = 'var(--text-dim)';
    inheritText.style.marginLeft = '4px';
    inheritText.style.display = 'none'; // Hidden by default

    // Toggle Logic
    iconContainer.addEventListener('click', () => {
      if (row.id === 'desktop') return; // Desktop always custom
      override[row.id] = !override[row.id];
      updateRow(row.id);
    });

    // Input Container
    const inputWrap = document.createElement('div');
    inputWrap.style.flex = '1';

    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = '0';
    input.className = 'fes-resp-input';
    input.dataset.id = row.id;
    input.style.width = '100%';
    input.style.height = '28px';
    input.style.padding = '0 8px';
    input.style.background = 'var(--panel-2)';
    input.style.border = '1px solid var(--border)';
    input.style.color = 'var(--text)';
    input.style.fontSize = '12px';
    input.style.fontFamily = 'monospace';
    input.style.borderRadius = 'var(--r-sm)';

    // Get effective value
    const getVal = (key) => {
      if (override[key]) {
        return v[key] !== undefined ? v[key] : '';
      }
      return v.desktop !== undefined ? v.desktop : '';
    };

    const updateRow = (id) => {
      const isCustom = override[id];
      input.disabled = !isCustom;
      input.style.opacity = isCustom ? '1' : '0.5';
      input.value = getVal(id);
      
      // Icon styling
      if (!isCustom) {
        iconEl.style.color = 'var(--text-dim)';
        inheritText.style.display = 'block';
      } else {
        iconEl.style.color = 'var(--accent-2)';
        inheritText.style.display = 'none';
      }
    };

    input.addEventListener('input', (e) => {
      const val = e.target.value;
      const valNum = val === '' ? '' : parseFloat(val);
      v[row.id] = valNum;
      onChange(v);
    });

    // Assemble Row
    iconContainer.appendChild(iconEl);
    iconContainer.appendChild(inheritText);
    rowEl.appendChild(iconContainer);
    rowEl.appendChild(inputWrap);
    inputWrap.appendChild(input);
    container.appendChild(rowEl);

    // Init
    updateRow(row.id);
  });

  return container;
}