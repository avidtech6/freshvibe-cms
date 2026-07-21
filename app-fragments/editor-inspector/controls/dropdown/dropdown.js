/**
 * Dropdown Control Module
 * Renders a searchable/custom dropdown listbox.
 */
export function render(field, value, onChange, adapter) {
  const container = document.createElement('div');
  container.className = 'fes-control-dropdown';

  const {
    options = [],
    placeholder = 'Select...',
    searchable = false,
  } = field.props || {};

  let isOpen = false;
  let listbox = null;
  let searchInput = null;
  let searchValue = '';
  let filteredOptions = [...options];

  // --- Render Trigger ---
  const trigger = document.createElement('button');
  trigger.className = 'fes-dropdown-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  
  function updateTrigger() {
    trigger.textContent = value || placeholder;
    trigger.setAttribute('aria-expanded', isOpen);
  }

  function toggle() {
    isOpen = !isOpen;
    renderDropdown();
    updateTrigger();
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  // --- Render Dropdown Container ---
  function renderDropdown() {
    if (!isOpen) {
      if (listbox) listbox.remove();
      return;
    }

    // If already exists, just update content
    if (listbox) {
      updateListboxContent();
      return;
    }

    // Create Listbox
    listbox = document.createElement('div');
    listbox.className = 'fes-dropdown-listbox';
    listbox.style.position = 'absolute';
    listbox.style.top = '100%';
    listbox.style.left = '0';
    listbox.style.right = '0';
    listbox.style.zIndex = '1000';

    // Search Input (if searchable)
    if (searchable && options.length > 6) {
      searchInput = document.createElement('input');
      searchInput.className = 'fes-dropdown-search';
      searchInput.placeholder = 'Search...';
      searchInput.addEventListener('input', (e) => {
        searchValue = e.target.value.toLowerCase();
        updateListboxContent();
      });
      listbox.appendChild(searchInput);
      searchInput.focus();
    }

    // Options List
    const ul = document.createElement('ul');
    ul.className = 'fes-dropdown-options';
    listbox.appendChild(ul);
    updateListboxContent();

    container.appendChild(listbox);
  }

  function updateListboxContent() {
    filteredOptions = options.filter(opt => 
      opt.toString().toLowerCase().includes(searchValue)
    );

    const ul = listbox.querySelector('ul');
    ul.innerHTML = '';
    
    filteredOptions.forEach(opt => {
      const li = document.createElement('li');
      li.className = 'fes-dropdown-option';
      if (opt === value) li.classList.add('fes-dropdown-option-selected');
      li.textContent = opt;
      li.addEventListener('click', () => {
        onChange(opt);
        toggle();
      });
      ul.appendChild(li);
    });
  }

  // --- Close on Outside ---
  function closeOutside(e) {
    if (isOpen && !container.contains(e.target)) {
      isOpen = false;
      renderDropdown();
      updateTrigger();
    }
  }

  // --- Close on Escape ---
  function closeEscape(e) {
    if (isOpen && e.key === 'Escape') {
      isOpen = false;
      renderDropdown();
      updateTrigger();
    }
  }

  container.addEventListener('click', closeOutside);
  document.addEventListener('keydown', closeEscape);

  // Initial Render
  container.appendChild(trigger);
  return container;
}