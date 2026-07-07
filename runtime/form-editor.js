// runtime/form-editor.js — generic form editor for any module schema
// Reads a module's schema and renders an editable form. On save, writes
// back through the runtime scope system so field-level safety is honoured.
//
// Returns an HTMLElement. Caller mounts it into a panel.

// Field renderers by type. Each takes (fieldName, fieldDef, currentValue)
// and returns an HTMLElement.
const RENDERERS = {
  string: renderTextField,
  number: renderNumberField,
  boolean: renderBooleanField,
  color: renderColorField,
  url: renderUrlField,
  image: renderImageField,
  select: renderSelectField,
  array: renderArrayField,
  object: renderObjectField,
};

export function renderFormEditor({ moduleInstance, moduleDef, onSave }) {
  const root = document.createElement('form');
  root.className = 'fvcms-editor';
  root.addEventListener('submit', e => e.preventDefault());

  const header = document.createElement('div');
  header.className = 'fvcms-editor-header';
  header.textContent = `${moduleDef.label} · ${moduleInstance.id}`;
  root.appendChild(header);

  const fieldsRoot = document.createElement('div');
  fieldsRoot.className = 'fvcms-editor-fields';
  root.appendChild(fieldsRoot);

  const workingConfig = { ...moduleInstance.config };

  for (const [fieldName, fieldDef] of Object.entries(moduleDef.schema)) {
    const fieldEl = renderField(fieldName, fieldDef, workingConfig[fieldName]);
    fieldsRoot.appendChild(fieldEl.wrap);
  }

  // Variants section (if any)
  if (moduleDef.variants && moduleDef.variants.length > 0) {
    const variantRoot = document.createElement('div');
    variantRoot.className = 'fvcms-editor-variants';
    const label = document.createElement('div');
    label.className = 'fvcms-editor-label';
    label.textContent = 'Apply variant:';
    variantRoot.appendChild(label);
    const btnRow = document.createElement('div');
    btnRow.className = 'fvcms-editor-variant-buttons';
    for (const variant of moduleDef.variants) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fvcms-variant-btn';
      btn.textContent = variant.label;
      btn.addEventListener('click', () => {
        Object.assign(workingConfig, variant.config);
        if (onSave) onSave({ ...workingConfig });
      });
      btnRow.appendChild(btn);
    }
    variantRoot.appendChild(btnRow);
    root.appendChild(variantRoot);
  }

  // Save / Reset
  const actions = document.createElement('div');
  actions.className = 'fvcms-editor-actions';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'fvcms-save-btn';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => {
    // Read current values from DOM into workingConfig
    for (const el of fieldsRoot.querySelectorAll('[data-field-name]')) {
      const fname = el.dataset.fieldName;
      const ftype = el.dataset.fieldType;
      workingConfig[fname] = readFieldValue(el, ftype);
    }
    if (onSave) onSave({ ...workingConfig });
  });
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'fvcms-reset-btn';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => {
    Object.assign(workingConfig, moduleInstance.config);
    if (onSave) onSave({ ...workingConfig });
  });
  actions.appendChild(saveBtn);
  actions.appendChild(resetBtn);
  root.appendChild(actions);

  return root;
}

// ---- field renderers ----

function renderField(name, def, value) {
  const renderer = RENDERERS[def.type] || renderTextField;
  return renderer(name, def, value);
}

function renderTextField(name, def, value) {
  const wrap = makeWrap(name, def);
  const input = document.createElement(def.pattern || def.label?.includes('long') ? 'textarea' : 'input');
  if (input.tagName === 'INPUT') input.type = 'text';
  input.value = value || '';
  input.dataset.fieldName = name;
  input.dataset.fieldType = 'string';
  if (def.pattern) input.placeholder = `Pattern: ${def.pattern}`;
  wrap.appendChild(input);
  return { wrap };
}

function renderNumberField(name, def, value) {
  const wrap = makeWrap(name, def);
  const input = document.createElement('input');
  input.type = 'number';
  input.value = value ?? def.default ?? 0;
  if (def.min !== undefined) input.min = def.min;
  if (def.max !== undefined) input.max = def.max;
  input.dataset.fieldName = name;
  input.dataset.fieldType = 'number';
  wrap.appendChild(input);
  return { wrap };
}

function renderBooleanField(name, def, value) {
  const wrap = makeWrap(name, def);
  const label = document.createElement('label');
  label.className = 'fvcms-boolean-field';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!value;
  input.dataset.fieldName = name;
  input.dataset.fieldType = 'boolean';
  label.appendChild(input);
  const span = document.createElement('span');
  span.textContent = def.label || name;
  label.appendChild(span);
  wrap.appendChild(label);
  return { wrap };
}

function renderColorField(name, def, value) {
  const wrap = makeWrap(name, def);
  const input = document.createElement('input');
  input.type = 'color';
  input.value = value || '#000000';
  input.dataset.fieldName = name;
  input.dataset.fieldType = 'color';
  wrap.appendChild(input);
  return { wrap };
}

function renderUrlField(name, def, value) {
  const wrap = makeWrap(name, def);
  const input = document.createElement('input');
  input.type = 'url';
  input.value = value || '';
  input.dataset.fieldName = name;
  input.dataset.fieldType = 'url';
  wrap.appendChild(input);
  return { wrap };
}

function renderImageField(name, def, value) {
  const wrap = makeWrap(name, def);
  const input = document.createElement('input');
  input.type = 'text';
  input.value = (value && value.url) || value || '';
  input.placeholder = 'Image URL';
  input.dataset.fieldName = name;
  input.dataset.fieldType = 'image';
  wrap.appendChild(input);
  return { wrap };
}

function renderSelectField(name, def, value) {
  const wrap = makeWrap(name, def);
  const select = document.createElement('select');
  select.dataset.fieldName = name;
  select.dataset.fieldType = 'select';
  for (const opt of def.options || []) {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    select.appendChild(o);
  }
  wrap.appendChild(select);
  return { wrap };
}

function renderArrayField(name, def, value) {
  const wrap = makeWrap(name, def);
  const textarea = document.createElement('textarea');
  textarea.rows = 6;
  textarea.value = JSON.stringify(value || def.default || [], null, 2);
  textarea.dataset.fieldName = name;
  textarea.dataset.fieldType = 'array';
  wrap.appendChild(textarea);
  return { wrap };
}

function renderObjectField(name, def, value) {
  const wrap = makeWrap(name, def);
  const textarea = document.createElement('textarea');
  textarea.rows = 4;
  textarea.value = JSON.stringify(value || {}, null, 2);
  textarea.dataset.fieldName = name;
  textarea.dataset.fieldType = 'object';
  wrap.appendChild(textarea);
  return { wrap };
}

function makeWrap(name, def) {
  const wrap = document.createElement('div');
  wrap.className = 'fvcms-field';
  const label = document.createElement('label');
  label.className = 'fvcms-field-label';
  label.textContent = def.label || name;
  wrap.appendChild(label);
  if (def.required) {
    const star = document.createElement('span');
    star.className = 'fvcms-required';
    star.textContent = ' *';
    label.appendChild(star);
  }
  return wrap;
}

function readFieldValue(el, type) {
  switch (type) {
    case 'string': return el.value;
    case 'number': return parseFloat(el.value);
    case 'boolean': return el.checked;
    case 'color': return el.value;
    case 'url': return el.value;
    case 'image': return el.value ? { url: el.value } : null;
    case 'select': return el.value;
    case 'array':
    case 'object':
      try { return JSON.parse(el.value); }
      catch { return null; }
    default: return el.value;
  }
}