/*
 * CSS classes used in this module:
 *   fvcms-field-row, fvcms-field-label, fvcms-field-input, fvcms-field-help, fvcms-field-error
 *   fvcms-thumb, fvcms-gallery-row, fvcms-add-btn, fvcms-chip, fvcms-chip-remove
 * 
 * Note: These classes are defined in demo/admin.html
 */

// Caches
const contentTypeCache = new Map();
let listCache = null;

export async function loadContentType(name) {
  if (contentTypeCache.has(name)) {
    return contentTypeCache.get(name);
  }

  try {
    const response = await fetch(
      `https://vibecoder.freshvibeapps.com/api/agent/content-types/${name}`,
      {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer vibecoder-local'
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`API returned error: ${data.error || data.message || "Unknown error"}`);
    }

    contentTypeCache.set(name, data.type);
    return data.type;
  } catch (error) {
    throw new Error(`Failed to load content type: ${name} - ${error.message}`);
  }
}

export async function listContentTypes() {
  if (listCache !== null) {
    return listCache;
  }

  try {
    const response = await fetch(
      'https://vibecoder.freshvibeapps.com/api/agent/content-types',
      {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer vibecoder-local'
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`API returned error: ${data.error || data.message || "Unknown error"}`);
    }

    listCache = data.types;
    return data.types;
  } catch (error) {
    throw new Error(`Failed to list content types: ${error.message}`);
  }
}

export function clearContentTypeCache() {
  contentTypeCache.clear();
  listCache = null;
}

// RENDERERS

export const RENDERERS = {
  text: renderTextField,
  number: renderNumberField,
  richtext: renderRichtextField,
  image: renderImageField,
  gallery: renderGalleryField,
  tags: renderTagsField,
  date: renderDateField,
  url: renderUrlField
};

function renderTextField(fieldName, fieldDef, currentValue) {
  const wrap = document.createElement('div');
  wrap.className = 'fvcms-field-row';
  
  const label = document.createElement('label');
  label.className = 'fvcms-field-label';
  label.textContent = fieldDef.label;
  if (fieldDef.required) {
    const required = document.createElement('span');
    required.className = 'required';
    required.textContent = '*';
    label.appendChild(required);
  }
  wrap.appendChild(label);
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'fvcms-field-input';
  input.dataset.fieldName = fieldName;
  input.dataset.fieldType = 'text';
  if (currentValue !== undefined) input.value = currentValue;
  
  wrap.appendChild(input);
  
  if (fieldDef.description) {
    const help = document.createElement('div');
    help.className = 'fvcms-field-help';
    help.textContent = fieldDef.description;
    wrap.appendChild(help);
  }
  
  function getValue() {
    return input.value;
  }
  
  function setValue(value) {
    input.value = value || '';
  }
  
  function validate() {
    if (fieldDef.required && !input.value.trim()) {
      return 'Required';
    }
    return null;
  }
  
  return { wrap, getValue, setValue, validate };
}

function renderNumberField(fieldName, fieldDef, currentValue) {
  const wrap = document.createElement('div');
  wrap.className = 'fvcms-field-row';
  
  const label = document.createElement('label');
  label.className = 'fvcms-field-label';
  label.textContent = fieldDef.label;
  if (fieldDef.required) {
    const required = document.createElement('span');
    required.className = 'required';
    required.textContent = '*';
    label.appendChild(required);
  }
  wrap.appendChild(label);
  
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'fvcms-field-input';
  input.dataset.fieldName = fieldName;
  input.dataset.fieldType = 'number';
  if (fieldDef.options?.min) input.min = fieldDef.options.min;
  if (currentValue !== undefined) input.value = currentValue || 0;
  
  wrap.appendChild(input);
  
  if (fieldDef.description) {
    const help = document.createElement('div');
    help.className = 'fvcms-field-help';
    help.textContent = fieldDef.description;
    wrap.appendChild(help);
  }
  
  function getValue() {
    return Number(input.value);
  }
  
  function setValue(value) {
    input.value = value || 0;
  }
  
  function validate() {
    if (fieldDef.required && !input.value.trim()) {
      return 'Required';
    }
    if (input.value && isNaN(Number(input.value))) {
      return 'Must be a number';
    }
    if (fieldDef.options?.min && Number(input.value) < fieldDef.options.min) {
      return `Must be at least ${fieldDef.options.min}`;
    }
    return null;
  }
  
  return { wrap, getValue, setValue, validate };
}

function renderRichtextField(fieldName, fieldDef, currentValue) {
  const wrap = document.createElement('div');
  wrap.className = 'fvcms-field-row';
  
  const label = document.createElement('label');
  label.className = 'fvcms-field-label';
  label.textContent = fieldDef.label;
  if (fieldDef.required) {
    const required = document.createElement('span');
    required.className = 'required';
    required.textContent = '*';
    label.appendChild(required);
  }
  wrap.appendChild(label);
  
  const textarea = document.createElement('textarea');
  textarea.rows = 8;
  textarea.className = 'fvcms-field-input';
  textarea.dataset.fieldName = fieldName;
  textarea.dataset.fieldType = 'richtext';
  if (currentValue !== undefined) textarea.value = currentValue || '';
  
  wrap.appendChild(textarea);
  
  if (fieldDef.description) {
    const help = document.createElement('div');
    help.className = 'fvcms-field-help';
    help.textContent = fieldDef.description;
    wrap.appendChild(help);
  }
  
  function getValue() {
    return textarea.value;
  }
  
  function setValue(value) {
    textarea.value = value || '';
  }
  
  function validate() {
    if (fieldDef.required && !textarea.value.trim()) {
      return 'Required';
    }
    return null;
  }
  
  return { wrap, getValue, setValue, validate };
}

function renderImageField(fieldName, fieldDef, currentValue) {
  const wrap = document.createElement('div');
  wrap.className = 'fvcms-field-row';
  
  const label = document.createElement('label');
  label.className = 'fvcms-field-label';
  label.textContent = fieldDef.label;
  if (fieldDef.required) {
    const required = document.createElement('span');
    required.className = 'required';
    required.textContent = '*';
    label.appendChild(required);
  }
  wrap.appendChild(label);
  
  const input = document.createElement('input');
  input.type = 'url';
  input.className = 'fvcms-field-input';
  input.dataset.fieldName = fieldName;
  input.dataset.fieldType = 'image';
  if (currentValue !== undefined) input.value = currentValue || '';
  
  wrap.appendChild(input);
  
  const preview = document.createElement('img');
  preview.className = 'fvcms-thumb';
  preview.style.display = 'none';
  wrap.appendChild(preview);
  
  if (fieldDef.description) {
    const help = document.createElement('div');
    help.className = 'fvcms-field-help';
    help.textContent = fieldDef.description;
    wrap.appendChild(help);
  }
  
  input.addEventListener('input', () => {
    if (input.value) {
      preview.src = input.value;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  });
  
  // Initialize preview
  if (input.value) {
    preview.src = input.value;
    preview.style.display = 'block';
  }
  
  function getValue() {
    return input.value;
  }
  
  function setValue(value) {
    input.value = value || '';
    if (value) {
      preview.src = value;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  }
  
  function validate() {
    if (fieldDef.required && !input.value.trim()) {
      return 'Required';
    }
    return null;
  }
  
  return { wrap, getValue, setValue, validate };
}

function renderGalleryField(fieldName, fieldDef, currentValue) {
  const wrap = document.createElement('div');
  wrap.className = 'fvcms-field-row';
  
  const label = document.createElement('label');
  label.className = 'fvcms-field-label';
  label.textContent = fieldDef.label;
  if (fieldDef.required) {
    const required = document.createElement('span');
    required.className = 'required';
    required.textContent = '*';
    label.appendChild(required);
  }
  wrap.appendChild(label);
  
  const container = document.createElement('div');
  container.className = 'fvcms-gallery-container';
  wrap.appendChild(container);
  
  const values = currentValue ? [...currentValue] : [];
  
  function createRow(url = '', index) {
    const row = document.createElement('div');
    row.className = 'fvcms-gallery-row';
    
    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'fvcms-field-input';
    input.dataset.fieldName = fieldName;
    input.dataset.fieldType = 'gallery';
    input.value = url;
    row.appendChild(input);
    
    const remove = document.createElement('button');
    remove.className = 'fvcms-remove-btn';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      container.removeChild(row);
      updateValues();
    });
    row.appendChild(remove);
    
    input.addEventListener('input', updateValues);
    
    return row;
  }
  
  function updateValues() {
    const inputs = container.querySelectorAll('input');
    values.length = 0;
    inputs.forEach(input => {
      if (input.value.trim()) {
        values.push(input.value.trim());
      }
    });
  }
  
  values.forEach((url, index) => {
    container.appendChild(createRow(url, index));
  });
  
  const addBtn = document.createElement('button');
  addBtn.className = 'fvcms-add-btn';
  addBtn.textContent = '+ Add';
  addBtn.addEventListener('click', () => {
    const row = createRow();
    container.appendChild(row);
  });
  wrap.appendChild(addBtn);
  
  if (fieldDef.description) {
    const help = document.createElement('div');
    help.className = 'fvcms-field-help';
    help.textContent = fieldDef.description;
    wrap.appendChild(help);
  }
  
  function getValue() {
    updateValues();
    return values;
  }
  
  function setValue(value) {
    container.innerHTML = '';
    const newValues = value ? [...value] : [];
    newValues.forEach(url => {
      container.appendChild(createRow(url));
    });
    values.length = 0;
    values.push(...newValues);
  }
  
  function validate() {
    updateValues();
    if (fieldDef.required && values.length === 0) {
      return 'Required';
    }
    return null;
  }
  
  return { wrap, getValue, setValue, validate };
}

function renderTagsField(fieldName, fieldDef, currentValue) {
  const wrap = document.createElement('div');
  wrap.className = 'fvcms-field-row';
  
  const label = document.createElement('label');
  label.className = 'fvcms-field-label';
  label.textContent = fieldDef.label;
  if (fieldDef.required) {
    const required = document.createElement('span');
    required.className = 'required';
    required.textContent = '*';
    label.appendChild(required);
  }
  wrap.appendChild(label);
  
  const container = document.createElement('div');
  container.className = 'fvcms-tags-container';
  wrap.appendChild(container);
  
  const values = currentValue ? [...currentValue] : [];
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'fvcms-tag-input';
  input.placeholder = 'Add a tag...';
  container.appendChild(input);
  
  function createChip(tag) {
    const chip = document.createElement('div');
    chip.className = 'fvcms-chip';
    chip.textContent = tag;
    
    const remove = document.createElement('span');
    remove.className = 'fvcms-chip-remove';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      const index = values.indexOf(tag);
      if (index > -1) {
        values.splice(index, 1);
        container.removeChild(chip);
      }
    });
    
    chip.appendChild(remove);
    return chip;
  }
  
  function updateTags() {
    // Keep only chips and input
    while (container.firstChild && container.firstChild !== input) {
      container.removeChild(container.firstChild);
    }
    
    // Re-add chips
    values.forEach(tag => {
      container.insertBefore(createChip(tag), input);
    });
  }
  
  values.forEach(tag => {
    container.insertBefore(createChip(tag), input);
  });
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = input.value.trim();
      if (tag && !values.includes(tag)) {
        values.push(tag);
        container.insertBefore(createChip(tag), input);
        input.value = '';
      }
    }
  });
  
  if (fieldDef.description) {
    const help = document.createElement('div');
    help.className = 'fvcms-field-help';
    help.textContent = fieldDef.description;
    wrap.appendChild(help);
  }
  
  function getValue() {
    return [...values];
  }
  
  function setValue(value) {
    values.length = 0;
    if (value) {
      values.push(...value);
    }
    updateTags();
  }
  
  function validate() {
    if (fieldDef.required && values.length === 0) {
      return 'Required';
    }
    return null;
  }
  
  return { wrap, getValue, setValue, validate };
}

function renderDateField(fieldName, fieldDef, currentValue) {
  const wrap = document.createElement('div');
  wrap.className = 'fvcms-field-row';
  
  const label = document.createElement('label');
  label.className = 'fvcms-field-label';
  label.textContent = fieldDef.label;
  if (fieldDef.required) {
    const required = document.createElement('span');
    required.className = 'required';
    required.textContent = '*';
    label.appendChild(required);
  }
  wrap.appendChild(label);
  
  const input = document.createElement('input');
  input.type = 'date';
  input.className = 'fvcms-field-input';
  input.dataset.fieldName = fieldName;
  input.dataset.fieldType = 'date';
  if (currentValue !== undefined) input.value = currentValue || '';
  
  wrap.appendChild(input);
  
  if (fieldDef.description) {
    const help = document.createElement('div');
    help.className = 'fvcms-field-help';
    help.textContent = fieldDef.description;
    wrap.appendChild(help);
  }
  
  function getValue() {
    return input.value;
  }
  
  function setValue(value) {
    input.value = value || '';
  }
  
  function validate() {
    if (fieldDef.required && !input.value.trim()) {
      return 'Required';
    }
    return null;
  }
  
  return { wrap, getValue, setValue, validate };
}

function renderUrlField(fieldName, fieldDef, currentValue) {
  const wrap = document.createElement('div');
  wrap.className = 'fvcms-field-row';
  
  const label = document.createElement('label');
  label.className = 'fvcms-field-label';
  label.textContent = fieldDef.label;
  if (fieldDef.required) {
    const required = document.createElement('span');
    required.className = 'required';
    required.textContent = '*';
    label.appendChild(required);
  }
  wrap.appendChild(label);
  
  const input = document.createElement('input');
  input.type = 'url';
  input.className = 'fvcms-field-input';
  input.dataset.fieldName = fieldName;
  input.dataset.fieldType = 'url';
  if (currentValue !== undefined) input.value = currentValue || '';
  
  wrap.appendChild(input);
  
  if (fieldDef.description) {
    const help = document.createElement('div');
    help.className = 'fvcms-field-help';
    help.textContent = fieldDef.description;
    wrap.appendChild(help);
  }
  
  function getValue() {
    return input.value;
  }
  
  function setValue(value) {
    input.value = value || '';
  }
  
  function validate() {
    if (fieldDef.required && !input.value.trim()) {
      return 'Required';
    }
    if (input.value && !input.value.match(/^https?:\/\/.+/)) {
      return 'Must be a valid URL';
    }
    return null;
  }
  
  return { wrap, getValue, setValue, validate };
}