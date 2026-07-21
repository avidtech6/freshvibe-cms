// === background-image.js ===

const FIT_OPTIONS = ['cover', 'contain', 'fill', 'none'];
const POSITION_OPTIONS = ['top', 'center', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
const ATTACHMENT_OPTIONS = ['scroll', 'fixed', 'local'];
const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];

export function render(field, value = {
  url: '',
  fit: 'cover',
  position: 'center',
  attachment: 'scroll',
  overlay: '#000000',
  blend: 'normal'
}, onChange) {
  const container = document.createElement('div');
  container.className = 'fes-control-bg-image';

  const updatePreview = () => {
    const style = container.querySelector('.fes-preview-box').style;
    style.backgroundImage = value.url ? `url('${value.url}')` : 'none';
    style.backgroundSize = value.fit;
    style.backgroundPosition = value.position;
    style.backgroundAttachment = value.attachment;
    style.backgroundBlendMode = value.blend;
    style.backgroundColor = value.overlay;
    container.classList.toggle('has-image', !!value.url);
  };

  // 1. Upload Zone
  const uploadContainer = document.createElement('div');
  uploadContainer.className = 'fes-upload-zone';
  if (value.url) {
    uploadContainer.style.backgroundImage = `url('${value.url}')`;
    uploadContainer.style.backgroundSize = 'cover';
    uploadContainer.style.backgroundPosition = 'center';
  }

  const uploadText = document.createElement('div');
  uploadText.className = 'fes-upload-text';
  if (value.url) {
    uploadText.textContent = 'Change Image';
    uploadText.style.background = 'rgba(0,0,0,0.6)';
    uploadText.style.padding = '4px 8px';
    uploadText.style.borderRadius = '4px';
    uploadText.style.fontSize = '11px';
  } else {
    uploadText.textContent = 'Click to Upload Image';
  }

  uploadContainer.onclick = () => {
    // Mock upload
    const newUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
    onChange({ ...value, url: newUrl });
  };

  uploadContainer.appendChild(uploadText);
  container.appendChild(uploadContainer);

  // 2. Properties Panel
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'fes-image-controls';
  
  if (!value.url) {
    controlsContainer.style.opacity = '0.5';
    controlsContainer.style.pointerEvents = 'none';
  }

  // Helper to make select
  const mkSelect = (label, key, options, subValue) => {
    const wrap = document.createElement('div');
    wrap.className = 'fes-prop-row';
    const lbl = document.createElement('label');
    lbl.className = 'fes-label';
    lbl.textContent = label;
    const sel = document.createElement('select');
    sel.className = 'fes-select';
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (subValue === opt) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = (e) => onChange({ ...value, [key]: e.target.value });
    wrap.appendChild(lbl);
    wrap.appendChild(sel);
    return wrap;
  };

  // Fit & Position Row
  const row1 = document.createElement('div');
  row1.className = 'fes-prop-row-group';
  row1.appendChild(mkSelect('Fit', 'fit', FIT_OPTIONS, value.fit));
  row1.appendChild(mkSelect('Position', 'position', POSITION_OPTIONS, value.position));
  controlsContainer.appendChild(row1);

  // Attachment & Blend Row
  const row2 = document.createElement('div');
  row2.className = 'fes-prop-row-group';
  row2.appendChild(mkSelect('Attachment', 'attachment', ATTACHMENT_OPTIONS, value.attachment));
  row2.appendChild(mkSelect('Blend Mode', 'blend', BLEND_MODES, value.blend));
  controlsContainer.appendChild(row2);

  // Overlay Row
  const row3 = document.createElement('div');
  row3.className = 'fes-prop-row';
  row3.appendChild(mkSelect('Overlay Color', 'overlay', ['none', ...FIT_OPTIONS], value.overlay));
  controlsContainer.appendChild(row3);

  container.appendChild(controlsContainer);

  // 3. Live Preview
  const previewContainer = document.createElement('div');
  previewContainer.className = 'fes-live-preview-wrap';
  const previewBox = document.createElement('div');
  previewBox.className = 'fes-live-preview-box';
  previewBox.style.height = '60px';
  previewBox.style.background = value.overlay;
  previewBox.style.backgroundImage = value.url ? `url('${value.url}')` : 'none';
  previewBox.style.backgroundSize = value.fit;
  previewBox.style.backgroundPosition = value.position;
  previewBox.style.backgroundAttachment = value.attachment;
  previewBox.style.backgroundBlendMode = value.blend;
  previewContainer.appendChild(previewBox);
  container.appendChild(previewContainer);

  // Initialize
  updatePreview();

  return container;
}