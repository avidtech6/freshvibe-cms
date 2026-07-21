export function render(field, value, onChange, adapter) {
  const config = field.config || {};
  const unit = config.unit || "px";
  const linked = config.linked !== false ? true : false;
  
  // Normalize value object
  const v = value || { top: "", right: "", bottom: "", left: "" };

  const container = document.createElement('div');
  container.className = 'fes-control-dimension fes-row';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'space-between';
  container.style.width = '100%';

  // Inputs Container
  const inputsWrap = document.createElement('div');
  inputsWrap.className = 'fes-dim-inputs';
  inputsWrap.style.display = 'flex';
  inputsWrap.style.gap = '4px';
  inputsWrap.style.alignItems = 'center';

  const fields = ['top', 'right', 'bottom', 'left'];

  // Link Button
  const linkBtn = document.createElement('button');
  linkBtn.className = 'fes-dim-link';
  linkBtn.style.display = 'flex';
  linkBtn.style.alignItems = 'center';
  linkBtn.style.justifyContent = 'center';
  linkBtn.style.width = '32px';
  linkBtn.style.height = '32px';
  linkBtn.style.borderRadius = 'var(--r-sm)';
  linkBtn.style.border = '1px solid var(--border)';
  linkBtn.style.background = 'var(--panel)';
  linkBtn.style.cursor = 'pointer';
  linkBtn.title = linked ? 'Unlink (Edit individually)' : 'Link (Sync all)';
  linkBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 7v6a3 3 0 1 1-6 0V7a4 4 0 1 1 8 0z"></path><path d="M5 21v-6a4 4 0 0 1 8 0v6"></path></svg>`;

  // Create Inputs
  const inputEls = {};
  
  const createInput = (key) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'fes-dim-input';
    input.dataset.key = key;
    input.placeholder = '0';
    input.style.width = '32px';
    input.style.height = '24px';
    input.style.textAlign = 'center';
    input.style.background = 'var(--panel-2)';
    input.style.border = '1px solid var(--border)';
    input.style.color = 'var(--text)';
    input.style.fontSize = '11px';
    input.style.fontFamily = 'monospace';
    input.style.borderRadius = 'var(--r-sm)';
    input.value = v[key] !== undefined ? v[key] : '';
    
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      const valNum = val === '' ? '' : parseFloat(val);
      
      // Update UI immediately
      if (linked) {
        fields.forEach(k => {
          inputEls[k].value = val;
        });
      }
      
      // Update Data Object
      v[key] = valNum;

      // Debounce emit slightly
      onChange(v);
    });

    input.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') input.blur();
    });

    return input;
  };

  fields.forEach(key => {
    inputEls[key] = createInput(key);
    inputsWrap.appendChild(inputEls[key]);
  });

  container.appendChild(inputsWrap);
  container.appendChild(linkBtn);

  // Link Toggle Logic
  linkBtn.addEventListener('click', () => {
    linked = !linked;
    
    // Visual Feedback
    if (linked) {
      // Restore state or keep current value?
      // Let's reset all to the current active input value
      const currentVal = Object.values(v).find(v => v !== '') || 0;
      fields.forEach(k => {
        inputEls[k].value = currentVal;
      });
      linkBtn.style.background = 'var(--accent)';
      linkBtn.style.color = 'var(--bg)';
    } else {
      linkBtn.style.background = 'var(--panel)';
      linkBtn.style.color = 'var(--text)';
    }

    linkBtn.title = linked ? 'Unlink' : 'Link';
    onChange(v);
  });

  return container;
}