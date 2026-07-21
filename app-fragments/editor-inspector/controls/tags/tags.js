export function render(field, value, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-tags';
  const tags = value || [];
  let inputValue = '';

  const style = document.createElement('style');
  style.textContent = `
    :root { --bg: #0b0d11; --panel: #14181f; --panel-2: #1a1f27; --border: #2a3038;
      --text: #e6e9ef; --text-mid: #b8bfca; --accent: #7cf0a0; --accent-2: #5fa8ff;
      --r-sm: 4px; --r-md: 6px; }
    .fes-control-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .fes-tag {
      background: var(--panel); border: 1px solid var(--border); color: var(--text-mid);
      border-radius: var(--r-sm); padding: 4px 8px 4px 6px; font-size: 12px; display: flex;
      align-items: center; gap: 6px;
    }
    .fes-tag.active { background: var(--accent-2); color: #fff; border-color: var(--accent-2); }
    .fes-tag-close { cursor: pointer; opacity: 0.6; display: flex; align-items: center; }
    .fes-tag-close:hover { opacity: 1; color: #fff; }
    .fes-input {
      background: transparent; border: none; color: var(--text);
      outline: none; font-size: 13px; min-width: 120px;
    }
  `;
  container.appendChild(style);

  const renderTags = () => {
    // Clear existing tags (except input if we were separate, but here we re-render container for simplicity)
    // Better performance: diff, but for Vanilla JS task, full clear + append is acceptable for small sets.
    // Let's rebuild the list from scratch.
    container.innerHTML = '';
    
    tags.forEach((tag, index) => {
      const el = document.createElement('div');
      el.className = 'fes-tag';
      el.textContent = tag;
      
      const close = document.createElement('span');
      close.className = 'fes-tag-close';
      close.innerHTML = '×';
      close.onclick = () => {
        const newTags = [...tags];
        newTags.splice(index, 1);
        onChange(newTags);
      };
      el.appendChild(close);
      container.appendChild(el);
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fes-input';
    input.placeholder = field.placeholder || 'Add a tag...';
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = inputValue.trim();
        if (val) {
          const newTags = [...tags, val];
          onChange(newTags);
          inputValue = '';
          input.value = '';
        }
      } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
        e.preventDefault();
        const newTags = [...tags];
        newTags.pop();
        onChange(newTags);
      }
    };

    input.oninput = (e) => {
      inputValue = e.target.value;
    };

    container.appendChild(input);
  };

  renderTags();
  return container;
}