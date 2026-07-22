import { loadContentType, listContentTypes, RENDERERS } from './content-types.js';
import { listItems, getItem, createItem, updateItem, deleteItem } from './content-api-client.js';

export async function renderContentAdmin({ type, item, onSaved, onCancelled } = {}) {
  const container = document.createElement('div');
  container.className = 'fvcms-admin';

  async function selectContentType(selectedType) {
    container.innerHTML = '';
    await renderContentAdmin({ type: selectedType, item, onSaved, onCancelled });
  }

  if (!type) {
    const picker = await renderContentPicker({ onSelect: selectContentType });
    container.appendChild(picker);
    return container;
  }

  async function renderForm() {
    try {
      const contentType = await loadContentType(type);
      let formData = {};
      
      if (item) {
        formData = item.data || {};
      } else {
        formData = { ...contentType.sample_data };
      }

      const headerBar = document.createElement('div');
      headerBar.className = 'fvcms-admin-header';
      
      const backLink = document.createElement('a');
      backLink.href = '#';
      backLink.className = 'fvcms-admin-back';
      backLink.textContent = '← back';
      backLink.addEventListener('click', (e) => {
        e.preventDefault();
        selectContentType();
      });
      
      const title = document.createElement('h1');
      title.className = 'fvcms-admin-title';
      title.textContent = item ? `Edit: ${formData.title || formData.name || item.id}` : `New ${contentType.name}`;
      
      const itemsLink = document.createElement('a');
      itemsLink.href = '#';
      itemsLink.textContent = 'items';
      itemsLink.addEventListener('click', (e) => {
        e.preventDefault();
        renderContentList({ type, onSelect: (selectedItem) => selectContentType(selectedItem) });
      });
      
      headerBar.appendChild(backLink);
      headerBar.appendChild(title);
      headerBar.appendChild(itemsLink);
      container.appendChild(headerBar);

      const statusBanner = document.createElement('div');
      statusBanner.className = 'fvcms-status';
      statusBanner.style.display = 'none';
      container.appendChild(statusBanner);

      const form = document.createElement('form');
      form.className = 'fvcms-editor-fields';
      
      contentType.fields.forEach(field => {
        const renderer = RENDERERS[field.type];
        if (!renderer) return;
        
        const fieldWrapper = document.createElement('div');
        fieldWrapper.className = 'fvcms-field';
        
        const label = document.createElement('label');
        label.textContent = field.label;
        if (field.required) label.textContent += ' *';
        fieldWrapper.appendChild(label);
        
        const rendererElement = renderer(field.name, field, formData[field.name] || '');
        const { wrap, getValue, setValue, validate } = rendererElement;
        fieldWrapper.appendChild(wrap);
        
        const errorElement = document.createElement('div');
        errorElement.className = 'fvcms-field-error';
        fieldWrapper.appendChild(errorElement);
        
        form.appendChild(fieldWrapper);
      });

      const buttons = document.createElement('div');
      buttons.className = 'fvcms-item-actions';
      
      const saveBtn = document.createElement('button');
      saveBtn.type = 'submit';
      saveBtn.className = 'fvcms-save-btn';
      saveBtn.textContent = item ? 'Update' : 'Create';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => {
        if (onCancelled) onCancelled();
        selectContentType();
      });
      
      buttons.appendChild(saveBtn);
      buttons.appendChild(cancelBtn);
      form.appendChild(buttons);
      
      container.appendChild(form);
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const errors = [];
        const data = {};
        
        contentType.fields.forEach(field => {
          const renderer = RENDERERS[field.type];
          if (!renderer) return;
          
          const rendererElement = form.querySelector(`[data-field-name="${field.name}"]`).rendererElement;
          const value = rendererElement.getValue();
          const error = rendererElement.validate();
          
          if (error) {
            errors.push({ field: field.name, error });
          }
          
          data[field.name] = value;
        });
        
        if (errors.length > 0) {
          statusBanner.className = 'fvcms-status error';
          statusBanner.textContent = 'Please fix errors before saving.';
          statusBanner.style.display = 'block';
          
          errors.forEach(({ field, error }) => {
            const fieldWrapper = form.querySelector(`[data-field-name="${field}"]`).parentElement;
            const errorElement = fieldWrapper.querySelector('.fvcms-field-error');
            errorElement.textContent = error;
          });
          
          return;
        }
        
        try {
          statusBanner.className = 'fvcms-status info';
          statusBanner.textContent = 'Saving...';
          statusBanner.style.display = 'block';
          
          let savedItem;
          if (item) {
            savedItem = await updateItem(item.id, data);
          } else {
            savedItem = await createItem(type, data);
          }
          
          statusBanner.className = 'fvcms-status success';
          statusBanner.textContent = item ? 'Item updated!' : 'Item created!';
          statusBanner.style.display = 'block';
          
          if (onSaved) onSaved(savedItem);
          setTimeout(() => {
            statusBanner.style.display = 'none';
          }, 2000);
          
          renderRecentItems();
        } catch (err) {
          statusBanner.className = 'fvcms-status error';
          statusBanner.textContent = `Error: ${err.message}`;
          statusBanner.style.display = 'block';
        }
      });
      
      async function renderRecentItems() {
        const recentItemsContainer = document.createElement('div');
        recentItemsContainer.className = 'fvcms-items-list';
        recentItemsContainer.innerHTML = '<h2>Recent items</h2>';
        
        try {
          const { items } = await listItems(type, { page: 1, perPage: 20 });
          
          if (items.length === 0) {
            recentItemsContainer.innerHTML = '<h2>Recent items</h2><p>No items yet</p>';
            container.appendChild(recentItemsContainer);
            return;
          }
          
          items.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'fvcms-item-row';
            
            const itemTitle = document.createElement('span');
            const titleField = item.data?.title || item.data?.name || item.id;
            itemTitle.textContent = titleField;
            
            const createdDate = document.createElement('span');
            createdDate.textContent = new Date(item.created).toLocaleDateString();
            
            const actions = document.createElement('div');
            actions.className = 'fvcms-item-actions';
            
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => {
              selectContentType({ ...item, data: item.data });
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', async () => {
              if (window.confirm(`Are you sure you want to delete "${titleField}"?`)) {
                try {
                  await deleteItem(item.id);
                  itemRow.remove();
                } catch (err) {
                  alert(`Error: ${err.message}`);
                }
              }
            });
            
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            
            itemRow.appendChild(itemTitle);
            itemRow.appendChild(createdDate);
            itemRow.appendChild(actions);
            
            recentItemsContainer.appendChild(itemRow);
          });
          
          container.appendChild(recentItemsContainer);
        } catch (err) {
          recentItemsContainer.innerHTML = `<h2>Recent items</h2><p>Error loading items: ${err.message}</p>`;
          container.appendChild(recentItemsContainer);
        }
      }
      
      await renderRecentItems();
    } catch (err) {
      statusBanner.className = 'fvcms-status error';
      statusBanner.textContent = `Error: ${err.message}`;
      statusBanner.style.display = 'block';
    }
  }
  
  await renderForm();
  return container;
}

export async function renderContentList({ type, onSelect }) {
  const container = document.createElement('div');
  container.className = 'fvcms-admin';
  
  const headerBar = document.createElement('div');
  headerBar.className = 'fvcms-admin-header';
  
  const backLink = document.createElement('a');
  backLink.href = '#';
  backLink.className = 'fvcms-admin-back';
  backLink.textContent = '← back';
  backLink.addEventListener('click', (e) => {
    e.preventDefault();
    renderContentAdmin({ type });
  });
  
  const title = document.createElement('h1');
  title.className = 'fvcms-admin-title';
  title.textContent = `${type} items`;
  
  headerBar.appendChild(backLink);
  headerBar.appendChild(title);
  container.appendChild(headerBar);
  
  const itemsList = document.createElement('div');
  itemsList.className = 'fvcms-items-list';
  
  try {
    const { items } = await listItems(type, { page: 1, perPage: 50 });
    
    if (items.length === 0) {
      itemsList.innerHTML = '<p>No items found</p>';
      container.appendChild(itemsList);
      return container;
    }
    
    items.forEach(item => {
      const itemRow = document.createElement('div');
      itemRow.className = 'fvcms-item-row';
      
      const itemTitle = document.createElement('span');
      const titleField = item.data?.title || item.data?.name || item.id;
      itemTitle.textContent = titleField;
      
      const createdDate = document.createElement('span');
      createdDate.textContent = new Date(item.created).toLocaleDateString();
      
      const actions = document.createElement('div');
      actions.className = 'fvcms-item-actions';
      
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => onSelect(item));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async () => {
        if (window.confirm(`Are you sure you want to delete "${titleField}"?`)) {
          try {
            await deleteItem(item.id);
            itemRow.remove();
          } catch (err) {
            alert(`Error: ${err.message}`);
          }
        }
      });
      
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      
      itemRow.appendChild(itemTitle);
      itemRow.appendChild(createdDate);
      itemRow.appendChild(actions);
      
      itemsList.appendChild(itemRow);
    });
    
    container.appendChild(itemsList);
  } catch (err) {
    itemsList.innerHTML = `<p>Error loading items: ${err.message}</p>`;
    container.appendChild(itemsList);
  }
  
  return container;
}

export async function renderContentPicker({ onSelect }) {
  const container = document.createElement('div');
  container.className = 'fvcms-type-picker';
  
  try {
    const types = await listContentTypes();
    
    if (types.length === 0) {
      container.innerHTML = '<p>No content types available</p>';
      return container;
    }
    
    types.forEach(type => {
      const card = document.createElement('div');
      card.className = 'fvcms-type-card';
      
      const name = document.createElement('div');
      name.className = 'fvcms-type-card-name';
      name.textContent = type.name;
      
      const description = document.createElement('div');
      description.className = 'fvcms-type-card-desc';
      description.textContent = type.description;
      
      card.appendChild(name);
      card.appendChild(description);
      
      card.addEventListener('click', () => onSelect({ name: type.name }));
      
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<p>Error loading content types: ${err.message}</p>`;
  }
  
  return container;
}
