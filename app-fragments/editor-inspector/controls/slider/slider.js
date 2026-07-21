export function render(field, value, onChange, adapter) {
  const id = adapter.generateId();
  const config = field.config || {};
  
  // Defaults
  const min = config.min !== undefined ? config.min : 0;
  const max = config.max !== undefined ? config.max : 100;
  const step = config.step !== undefined ? config.step : 1;
  const unit = config.unit || '';
  const initialVal = value !== undefined ? value : (max - min) / 2;

  const container = document.createElement('div');
  container.className = 'fes-control-slider fes-row';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'space-between';
  container.style.width = '100%';
  container.style.gap = '12px';

  // Track Wrapper
  const trackWrap = document.createElement('div');
  trackWrap.className = 'fes-slider-track-wrap';
  trackWrap.style.flex = '1';
  trackWrap.style.position = 'relative';

  // The actual visual track
  const track = document.createElement('div');
  track.className = 'fes-slider-track';
  track.style.width = '100%';
  track.style.height = '6px';
  track.style.background = 'var(--panel-2)';
  track.style.borderRadius = 'var(--r-md)';
  
  // Progress Bar
  const progressBar = document.createElement('div');
  progressBar.className = 'fes-slider-progress';
  progressBar.style.height = '100%';
  progressBar.style.background = 'var(--accent)';
  progressBar.style.borderRadius = 'var(--r-md)';
  progressBar.style.width = '0%';
  progressBar.style.transition = 'width 0.1s linear'; // Smooth visual update

  // Handle
  const handle = document.createElement('div');
  handle.className = 'fes-slider-handle';
  handle.style.position = 'absolute';
  handle.style.top = '50%';
  handle.style.left = '0%'; // Start at 0%
  handle.style.transform = 'translate(-50%, -50%)';
  handle.style.width = '18px';
  handle.style.height = '18px';
  handle.style.background = 'var(--accent)';
  handle.style.borderRadius = '50%';
  handle.style.cursor = 'grab';
  handle.style.boxShadow = '0 0 0 4px var(--bg)'; // Floating effect

  // Value Input
  const input = document.createElement('input');
  input.type = 'number';
  input.value = initialVal;
  input.className = 'fes-slider-input';
  input.style.width = '48px';
  input.style.textAlign = 'right';
  input.style.background = 'var(--panel)';
  input.style.border = '1px solid var(--border)';
  input.style.color = 'var(--text)';
  input.style.fontFamily = 'monospace';
  input.style.fontSize = '12px';
  input.style.padding = '2px 4px';
  input.style.borderRadius = 'var(--r-sm)';
  input.style.outline = 'none';
  input.title = 'Click to edit exact value';

  // State Variables
  let currentVal = initialVal;
  let isDragging = false;
  let dragStartTime = 0;

  // Helper: Update UI
  const updateUI = () => {
    const pct = ((currentVal - min) / (max - min)) * 100;
    progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    handle.style.left = `${Math.max(0, Math.min(100, pct))}%`;
    input.value = Math.round(currentVal * 100) / 100;
  };

  // Logic: Set Value
  const setValue = (val) => {
    let v = parseFloat(val);
    if (isNaN(v)) v = min;
    v = Math.max(min, Math.min(max, v));
    // Snap to step
    const rawStep = parseFloat(step);
    if (!isNaN(rawStep) && rawStep > 0) {
        v = Math.round(v / rawStep) * rawStep;
    }
    if (v !== currentVal) {
      currentVal = v;
      updateUI();
      onChange(currentVal);
    }
  };

  // Interaction: Drag
  const startDrag = (e) => {
    isDragging = true;
    dragStartTime = Date.now();
    handle.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    // Immediate update on start
    updateUI();
  };

  const onDrag = (e) => {
    if (!isDragging) return;
    const rect = track.getBoundingClientRect();
    let x = e.clientX - rect.left;
    // Handle padding relative to track start
    x = Math.max(0, Math.min(rect.width, x));
    const pct = x / rect.width;
    currentVal = min + pct * (max - min);
    
    // Debounce handler via rAF or simple logic
    // For this requirement, we update state, but maybe throttle visual
    // Simple debounce logic here for immediate feedback
    updateUI();
  };

  const stopDrag = () => {
    if (isDragging) {
      isDragging = false;
      handle.style.cursor = 'grab';
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      // Final emit
      onChange(currentVal);
    }
  };

  // Interaction: Input
  input.addEventListener('change', () => setValue(input.value));
  input.addEventListener('focus', () => input.select());
  // Double click logic handled by browser natively + focus
  input.addEventListener('dblclick', () => input.select());

  // Connect Track to Handle events
  track.addEventListener('mousedown', (e) => {
     // Click on track to jump
     const rect = track.getBoundingClientRect();
     const x = e.clientX - rect.left;
     const pct = Math.max(0, Math.min(1, x / rect.width));
     currentVal = min + pct * (max - min);
     setValue(currentVal);
  });

  // Assemble
  track.appendChild(progressBar);
  track.appendChild(handle);
  trackWrap.appendChild(track);
  container.appendChild(trackWrap);
  container.appendChild(input);

  return container;
}