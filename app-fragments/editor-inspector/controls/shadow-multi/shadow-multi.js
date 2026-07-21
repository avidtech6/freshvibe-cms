export function render(field, value, onChange) {
  const container = document.createElement('div');
  container.className = 'fes-shadow-multi';

  const previewBox = document.createElement('div');
  previewBox.className = 'fes-shadow-preview';
  previewBox.style.boxShadow = '0px 0px 0px 0px rgba(0,0,0,1)';

  const layersList = document.createElement('div');
  layersList.className = 'fes-layers-list';

  // Helper to create layer row
  const createLayerRow = (layerIndex, layerData) => {
    const row = document.createElement('div');
    row.className = 'fes-layer-row';
    row.dataset.index = layerIndex;

    // Inputs
    const createInput = (label, type, val, step = 1) => {
      const wrap = document.createElement('div');
      wrap.className = 'fes-layer-input-wrap';
      const lbl = document.createElement('label');
      lbl.textContent = label;
      lbl.className = 'fes-input-label';
      const input = document.createElement('input');
      input.type = type;
      input.step = step;
      input.value = val;
      input.className = 'fes-layer-input';
      wrap.appendChild(lbl);
      wrap.appendChild(input);
      return wrap;
    };

    const xInput = createInput('X', 'number', layerData.x, 1);
    const yInput = createInput('Y', 'number', layerData.y, 1);
    const blurInput = createInput('B', 'number', layerData.blur, 1);
    const spreadInput = createInput('S', 'number', layerData.spread, 1);

    // Color
    const colorWrap = document.createElement('div');
    colorWrap.className = 'fes-layer-input-wrap';
    colorWrap.style.flexGrow = 1;
    colorWrap.style.minWidth = '40px';
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'C';
    colorLabel.className = 'fes-input-label';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = layerData.color;
    colorInput.className = 'fes-layer-input';
    colorWrap.appendChild(colorLabel);
    colorWrap.appendChild(colorInput);

    // Inset
    const insetWrap = document.createElement('div');
    insetWrap.className = 'fes-layer-input-wrap';
    insetWrap.style.justifyContent = 'center';
    insetWrap.style.alignItems = 'center';
    insetWrap.style.width = '30px';
    const insetLabel = document.createElement('label');
    insetLabel.textContent = 'In';
    insetLabel.className = 'fes-input-label';
    const insetInput = document.createElement('input');
    insetInput.type = 'checkbox';
    insetInput.checked = layerData.inset;
    insetInput.className = 'fes-layer-input';
    insetWrap.appendChild(insetLabel);
    insetWrap.appendChild(insetInput);

    // Delete
    const delBtn = document.createElement('button');
    delBtn.className = 'fes-btn-icon';
    delBtn.innerHTML = '&times;';
    delBtn.style.flexShrink = 0;

    // Combine
    row.appendChild(xInput);
    row.appendChild(yInput);
    row.appendChild(blurInput);
    row.appendChild(spreadInput);
    row.appendChild(colorWrap);
    row.appendChild(insetWrap);
    row.appendChild(delBtn);

    // Listeners
    const updateLayer = () => {
      const newLayers = value.layers.map((l, i) => i === layerIndex ? {
        x: parseInt(xInput.value) || 0,
        y: parseInt(yInput.value) || 0,
        blur: parseInt(blurInput.value) || 0,
        spread: parseInt(spreadInput.value) || 0,
        color: colorInput.value,
        inset: insetInput.checked
      } : l);
      const shadowString = constructShadow(newLayers);
      onChange({ layers: newLayers }, shadowString);
      previewBox.style.boxShadow = shadowString;
    };

    [xInput, yInput, blurInput, spreadInput, colorInput, insetInput].forEach(el => {
      el.addEventListener('input', updateLayer);
    });
    delBtn.addEventListener('click', () => {
      if (value.layers.length > 1) {
        const newLayers = value.layers.filter((_, i) => i !== layerIndex);
        onChange({ layers: newLayers }, constructShadow(newLayers));
        render(); // Re-render to remove row
      }
    });

    return row;
  };

  const constructShadow = (layers) => {
    return layers.map(l => {
      const inset = l.inset ? 'inset ' : '';
      const color = l.color;
      const val = `${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${color}`;
      return inset ? `inset ${val}` : val;
    }).join(', ');
  };

  const renderLayers = () => {
    layersList.innerHTML = '';
    value.layers.forEach((layer, i) => {
      layersList.appendChild(createLayerRow(i, layer));
    });
  };

  const addLayer = () => {
    const newLayer = { x: 0, y: 0, blur: 0, spread: 0, color: '#000000', inset: false };
    const newLayers = [...value.layers, newLayer];
    onChange({ layers: newLayers }, constructShadow(newLayers));
    renderLayers();
  };

  const addBtn = document.createElement('button');
  addBtn.className = 'fes-btn-add';
  addBtn.textContent = '+ Add layer';
  addBtn.onclick = addLayer;

  renderLayers();
  previewBox.style.boxShadow = constructShadow(value.layers);

  container.appendChild(previewBox);
  container.appendChild(layersList);
  container.appendChild(addBtn);

  return container;
}