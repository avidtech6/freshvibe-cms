// === background-unsplash.js ===

const MOCK_IMAGES = [
  { id: '1', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80', title: 'Curated Nature', author: 'Forest' },
  { id: '2', url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=600&q=80', title: 'Curated Architecture', author: 'City' },
  { id: '3', url: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=600&q=80', title: 'Curated Water', author: 'Ocean' },
  { id: '4', url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=600&q=80', title: 'Forest Path', author: 'Nature' },
  { id: '5', url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80', title: 'Classroom Study', author: 'Books' },
  { id: '6', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80', title: 'Books Library', author: 'Library' }
];

const CATEGORIES = ['Curated', 'Forest', 'Classroom', 'Books', 'Recent'];

export function render(field, value = { url: '', author: '' }, onChange) {
  const container = document.createElement('div');
  container.className = 'fes-control-bg-unsplash';

  // State
  let currentCategory = 'Curated';
  let searchQuery = '';

  // 1. Search & Chips
  const header = document.createElement('div');
  header.className = 'fes-unsplash-header';

  const searchInput = document.createElement('input');
  searchInput.className = 'fes-search-input';
  searchInput.type = 'text';
  searchInput.placeholder = 'Search images...';
  searchInput.value = searchQuery;
  
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderGrid(); // Re-render grid on search
  });

  const chipsContainer = document.createElement('div');
  chipsContainer.className = 'fes-chips-group';

  const updateChips = () => {
    chipsContainer.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = `fes-chip ${currentCategory === cat ? 'active' : ''}`;
      chip.textContent = cat;
      chip.onclick = () => {
        currentCategory = cat;
        searchQuery = '';
        searchInput.value = '';
        renderGrid();
      };
      chipsContainer.appendChild(chip);
    });
  };
  updateChips();

  header.append(searchInput, chipsContainer);
  container.appendChild(header);

  // 2. Grid
  const grid = document.createElement('div');
  grid.className = 'fes-unsplash-grid';

  const renderGrid = () => {
    grid.innerHTML = '';
    let images = MOCK_IMAGES;

    // Filter by Category
    if (currentCategory !== 'Recent') {
      images = images.filter(img => img.title.includes(currentCategory) || img.author === currentCategory);
    }

    // Filter by Search
    if (searchQuery) {
      images = images.filter(img => img.title.toLowerCase().includes(searchQuery) || img.author.toLowerCase().includes(searchQuery));
    }

    images.forEach(img => {
      const item = document.createElement('div');
      item.className = 'fes-grid-item';
      item.style.backgroundImage = `url('${img.url}')`;
      item.style.backgroundSize = 'cover';
      item.style.backgroundPosition = 'center';

      const overlay = document.createElement('div');
      overlay.className = 'fes-grid-overlay';

      const author = document.createElement('span');
      author.className = 'fes-grid-author';
      author.textContent = img.author;

      item.appendChild(overlay);
      item.appendChild(author);

      item.onclick = () => {
        onChange({ url: img.url, author: img.author });
      };

      grid.appendChild(item);
    });
  };

  renderGrid();
  container.appendChild(grid);

  return container;
}