const mockResponses = {
  'improve': 'Enhanced copy: The product has been improved for clarity and engagement. — Now more active and persuasive!',
  'match': 'Brand Match: Tone adjusted to align with corporate guidelines. — Professional yet modern.',
  'alt': 'Alt Text: A high-quality image of a modern architectural structure with warm lighting.',
  'heading': 'Heading: Unlock the Future of Design Today.'
};

const options = [
  { id: 'improve', label: 'Improve copy' },
  { id: 'match', label: 'Match brand' },
  { id: 'alt', label: 'Generate alt text' },
  { id: 'heading', label: 'Write heading' }
];

export function render(field, value, loading) {
  const container = document.createElement('div');
  container.className = 'fes-ai-assist';

  const btn = document.createElement('button');
  btn.className = 'fes-ai-btn';
  btn.innerHTML = '<span class="icon">✦</span> <span>AI: improve this</span>';
  if (loading) btn.disabled = true;

  // Modal
  const modal = document.createElement('div');
  modal.className = 'fes-ai-modal';
  modal.style.display = 'none';

  // Option Grid
  const optGrid = document.createElement('div');
  optGrid.className = 'fes-opt-grid';

  options.forEach(opt => {
    const optBtn = document.createElement('button');
    optBtn.className = 'fes-opt-btn';
    optBtn.textContent = opt.label;

    optBtn.addEventListener('click', () => {
      loading = true;
      render(); // Update button state

      setTimeout(() => {
        value = mockResponses[opt.id];
        loading = false;
        modal.querySelector('.fes-result-area').value = value;
        modal.style.display = 'block';
        render();
      }, 1500);
    });

    optGrid.appendChild(optBtn);
  });

  // Result Area
  const resultArea = document.createElement('textarea');
  resultArea.className = 'fes-result-area';
  resultArea.rows = 3;
  resultArea.placeholder = 'Select an option above...';
  resultArea.value = value;

  const applyBtn = document.createElement('button');
  applyBtn.className = 'fes-apply-btn';
  applyBtn.textContent = 'Apply';
  applyBtn.disabled = !value;

  applyBtn.addEventListener('click', () => {
    // In a real app, this might be an event emission. Here we assume
    // the control itself handles the "application" or parent listens to `onChange`.
    // For this demo, we just update the state variable `value`.
    // We signal the parent via onChange if provided.
    if (field && field.onChange) {
      field.onChange(value, value); // Example signature: (newValue, rawValue)
    }
    // Close modal after apply (simulated by clicking close or simple reload logic)
    // For this static render, we just stop here.
  });

  modal.appendChild(optGrid);
  modal.appendChild(resultArea);
  modal.appendChild(applyBtn);
  container.appendChild(btn);
  container.appendChild(modal);

  btn.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  return container;
}