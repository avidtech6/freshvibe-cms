// === background-gradient.js ===

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => {
    const hex = parseInt(x).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

function getGradientString(state) {
  if (state.type === 'none') return 'none';
  const stopsStr = state.stops.map(s => `${s.color} ${s.pos}%`).join(', ');
  if (state.type === 'linear') return `linear-gradient(${state.angle}deg, ${stopsStr})`;
  if (state.type === 'radial') return `radial-gradient(circle, ${stopsStr})`;
  if (state.type === 'conic') return `conic-gradient(from 0deg, ${stopsStr})`;
  return stopsStr;
}

export function render(field, value = { type: 'linear', angle: 90, stops: [] }, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-bg-gradient';

  // Ensure state structure
  const state = { ...value };
  if (!state.stops || state.stops.length < 2) {
    state.stops = [
      { id: 1, color: '#7cf0a0', pos: 0 },
      { id: 2, color: '#5fa8ff', pos: 100 }
    ];
  }

  // 1. Tabs
  const types = ['none', 'linear', 'radial', 'conic'];
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'fes-tabs';
  const typeBtns = types.map(t => {
    const btn = document.createElement('button');
    btn.className = `fes-tab ${state.type === t ? 'active' : ''}`;
    btn.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    btn.onclick = () => onChange({ ...state, type: t });
    return btn;
  });
  tabsContainer.append(...typeBtns);
  container.appendChild(tabsContainer);

  // 2. Angle Control
  const angleContainer = document.createElement('div');
  angleContainer.className = 'fes-angle-wrap';
  if (state.type === 'linear') {
    const label = document.createElement('label');
    label.className = 'fes-label';
    label.textContent = 'Angle';
    const input = document.createElement('input');
    input.className = 'fes-input';
    input.type = 'range';
    input.min = 0;
    input.max = 360;
    input.value = state.angle;
    input.oninput = (e) => onChange({ ...state, angle: parseInt(e.target.value) });
    angleContainer.appendChild(label);
    angleContainer.appendChild(input);
  }
  container.appendChild(angleContainer);

  // 3. Stops List
  const stopsList = document.createElement('div');
  stopsList.className = 'fes-stops-list';
  state.stops.forEach((stop, idx) => {
    const row = document.createElement('div');
    row.className = 'fes-stop-row';
    
    // Color
    const colorInput = document.createElement('input');
    colorInput.className = 'fes-stop-color';
    colorInput.type = 'color';
    colorInput.value = stop.color;
    colorInput.oninput = (e) => {
      const newStops = [...state.stops];
      newStops[idx].color = e.target.value;
      onChange({ ...state, stops: newStops });
    };

    // Position
    const posLabel = document.createElement('span');
    posLabel.className = 'fes-stop-pos-val';
    posLabel.textContent = stop.pos + '%';

    const posSlider = document.createElement('input');
    posSlider.className = 'fes-stop-slider';
    posSlider.type = 'range';
    posSlider.min = 0;
    posSlider.max = 100;
    posSlider.value = stop.pos;
    posSlider.oninput = (e) => {
      const newStops = [...state.stops];
      newStops[idx].pos = parseInt(e.target.value);
      onChange({ ...state, stops: newStops });
    };

    // Add/Remove
    const btns = document.createElement('div');
    btns.className = 'fes-stop-actions';
    
    if (state.stops.length > 2) {
      const remBtn = document.createElement('button');
      remBtn.textContent = '×';
      remBtn.className = 'fes-btn-icon';
      remBtn.onclick = () => {
        const newStops = state.stops.filter((_, i) => i !== idx);
        onChange({ ...state, stops: newStops });
      };
      btns.appendChild(remBtn);
    } else {
      const spacer = document.createElement('div');
      spacer.style.width = '16px';
      btns.appendChild(spacer);
    }

    row.append(colorInput, posSlider, posLabel, btns);
    stopsList.appendChild(row);
  });

  // Add Button
  const addBtn = document.createElement('button');
  addBtn.className = 'fes-btn-add';
  addBtn.textContent = '+ Add Stop';
  addBtn.onclick = () => {
    const newStops = [...state.stops];
    // Add at 50% or end
    const newPos = state.stops.length < 2 ? 50 : 100;
    newStops.push({ id: Date.now(), color: '#ffffff', pos: newPos });
    onChange({ ...state, stops: newStops });
  };
  stopsList.appendChild(addBtn);
  container.appendChild(stopsList);

  // 4. Preview Bar
  const previewContainer = document.createElement('div');
  previewContainer.className = 'fes-gradient-preview';
  const previewBar = document.createElement('div');
  previewBar.style.background = getGradientString(state);
  previewBar.className = 'fes-preview-bar';
  
  // Draggable Handles
  const handles = [];
  state.stops.forEach((stop, idx) => {
    const handle = document.createElement('div');
    handle.className = 'fes-preview-handle';
    handle.style.left = stop.pos + '%';
    handle.dataset.index = idx;
    
    // Initial drag state
    let isDragging = false;

    handle.onmousedown = (e) => {
      isDragging = true;
      e.stopPropagation();
    };

    handles.push(handle);
  });

  previewBar.append(...handles);
  previewContainer.appendChild(previewBar);
  container.appendChild(previewContainer);

  // Global Drag Logic
  const onMove = (e) => {
    const barRect = previewBar.getBoundingClientRect();
    const x = e.clientX - barRect.left;
    let pct = (x / barRect.width) * 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;

    const targetIdx = parseInt(e.target.dataset.index);
    if (isDragging && targetIdx !== undefined) {
      const newStops = [...state.stops];
      newStops[targetIdx].pos = Math.round(pct);
      
      // Update Visuals Immediately
      handles[targetIdx].style.left = newStops[targetIdx].pos + '%';
      previewBar.style.background = getGradientString({ ...state, stops: newStops });
      
      // Debounce or Trigger Change
      // For this simple version, we trigger on mouseup or throttled input
    }
  };

  const onUp = () => {
    isDragging = false;
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);

  return container;
}