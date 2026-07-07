// runtime/renderer.js — DOM re-renderer
// Applies module config + skin to the live DOM so edits show immediately.
//
// Each module has a render() function that knows how to update its DOM.
// The renderer subscribes to store changes and re-renders the affected
// modules. It does NOT regenerate the DOM from scratch — it patches.

import { getStore } from './store.js';
import { getModuleDef } from '../modules/index.js';

// Map of moduleId -> render function
const RENDERERS = {};

export function registerRenderer(moduleId, fn) {
  RENDERERS[moduleId] = fn;
}

/**
 * Re-render one module instance on the live page.
 * Reads its config from the store and the active skin, applies to the DOM.
 */
export function renderModule(moduleInstanceId) {
  const store = getStore();
  const m = store.getModule(moduleInstanceId);
  if (!m || !m.el) return;
  const def = getModuleDef(m.moduleId);
  if (!def) return;
  const render = RENDERERS[m.moduleId];
  if (!render) return;
  const skin = store.getSkin(store.activeContext.activeSkin);
  render(m, def, skin);
}

/**
 * Re-render ALL module instances currently in the store.
 * Used after a skin switch.
 */
export function renderAll() {
  const store = getStore();
  for (const id of Object.keys(store.modules)) {
    renderModule(id);
  }
}

/**
 * Connect a module instance's DOM element. Once connected, edits to the
 * config will auto-render the DOM.
 *
 * Call this for each module after the annotation loads and the modules
 * have their DOM elements discovered.
 */
export function connect(moduleInstanceId, el) {
  const store = getStore();
  const m = store.getModule(moduleInstanceId);
  if (!m) return;
  m.el = el;
  renderModule(moduleInstanceId);
}

// ---- built-in renderers ----

registerRenderer('M-heading', (m, def, skin) => {
  if (!m.el) return;
  let heading = m.el.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) {
    heading = document.createElement('h2');
    m.el.appendChild(heading);
  }
  // Apply text
  if (m.config.text != null) heading.textContent = m.config.text;
  // Apply level
  const targetLevel = (m.config.level || 'h2').toLowerCase();
  if (heading.tagName.toLowerCase() !== targetLevel) {
    const newHeading = document.createElement(targetLevel);
    newHeading.textContent = heading.textContent;
    heading.replaceWith(newHeading);
    heading = newHeading;
  }
  // Apply alignment
  if (m.config.align) {
    heading.style.textAlign = m.config.align;
  }
  // Apply color (per-instance override, else skin)
  const color = m.config.color || (skin && skin.cssTokens && skin.cssTokens['--heading-color']);
  if (color) heading.style.color = color;
  // Apply size
  if (m.config.size && m.config.size !== 'inherit') {
    heading.style.fontSize = `var(--heading-size-${m.config.size}, inherit)`;
  }
});

registerRenderer('M-cta', (m, def, skin) => {
  if (!m.el) return;
  let link = m.el.querySelector('a');
  if (!link) {
    link = document.createElement('a');
    link.className = 'fvcms-cta';
    m.el.appendChild(link);
  }
  if (m.config.text != null) link.textContent = m.config.text;
  if (m.config.href) link.href = m.config.href;
  if (m.config.openInNewTab) link.target = '_blank';
  else link.removeAttribute('target');
  // Variant class
  link.classList.remove('fvcms-variant-solid', 'fvcms-variant-outline',
    'fvcms-variant-ghost', 'fvcms-variant-link');
  if (m.config.variant) link.classList.add('fvcms-variant-' + m.config.variant);
  // Radius
  link.classList.remove('fvcms-radius-sharp', 'fvcms-radius-small',
    'fvcms-radius-medium', 'fvcms-radius-large', 'fvcms-radius-pill');
  if (m.config.radius) link.classList.add('fvcms-radius-' + m.config.radius);
  // Size
  link.classList.remove('fvcms-size-small', 'fvcms-size-medium', 'fvcms-size-large');
  if (m.config.size) link.classList.add('fvcms-size-' + m.config.size);
});

registerRenderer('M-image', (m, def, skin) => {
  if (!m.el) return;
  let img = m.el.querySelector('img');
  if (!img) {
    img = document.createElement('img');
    m.el.appendChild(img);
  }
  if (m.config.src) img.src = m.config.src;
  if (m.config.alt !== undefined) img.alt = m.config.alt || '';
  if (m.config.link) {
    if (!img.parentElement.matches('a')) {
      const wrapper = document.createElement('a');
      wrapper.href = m.config.link;
      img.replaceWith(wrapper);
      wrapper.appendChild(img);
    }
  }
  // Width
  if (m.config.width && m.config.width !== 'auto') {
    img.style.width = m.config.width === 'full' ? '100%' : m.config.width;
  } else {
    img.style.width = '';
  }
  // Aspect ratio
  if (m.config.aspectRatio && m.config.aspectRatio !== 'natural') {
    img.style.aspectRatio = m.config.aspectRatio.replace(':', ' / ');
    img.style.objectFit = 'cover';
  } else {
    img.style.aspectRatio = '';
    img.style.objectFit = '';
  }
});

registerRenderer('M-paragraph', (m, def, skin) => {
  if (!m.el) return;
  let p = m.el.querySelector('p');
  if (!p) {
    p = document.createElement('p');
    m.el.appendChild(p);
  }
  if (m.config.text != null) p.innerHTML = m.config.text;
  if (m.config.align) p.style.textAlign = m.config.align;
  if (m.config.size && m.config.size !== 'medium') {
    p.classList.remove('fvcms-paragraph-small', 'fvcms-paragraph-medium', 'fvcms-paragraph-large');
    p.classList.add('fvcms-paragraph-' + m.config.size);
  }
});

registerRenderer('M-menu', (m, def, skin) => {
  if (!m.el) return;
  let list = m.el.querySelector('ul');
  if (!list) {
    list = document.createElement('ul');
    list.className = 'fvcms-menu';
    m.el.appendChild(list);
  }
  list.innerHTML = '';
  for (const item of m.config.items || []) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = item.href || '/';
    a.textContent = item.label || '';
    if (item.openInNewTab) a.target = '_blank';
    li.appendChild(a);
    list.appendChild(li);
  }
  list.classList.remove('fvcms-menu-vertical', 'fvcms-menu-horizontal');
  list.classList.add('fvcms-menu-' + (m.config.layout || 'vertical'));
});

registerRenderer('M-social-icons', (m, def, skin) => {
  if (!m.el) return;
  let container = m.el.querySelector('.fvcms-social-icons');
  if (!container) {
    container = document.createElement('div');
    container.className = 'fvcms-social-icons';
    m.el.appendChild(container);
  }
  container.innerHTML = '';
  container.classList.remove('fvcms-social-horizontal', 'fvcms-social-vertical');
  container.classList.add('fvcms-social-' + (m.config.layout || 'horizontal'));
  for (const p of m.config.platforms || []) {
    const a = document.createElement('a');
    a.href = p.url || '#';
    a.className = 'fvcms-social-icon';
    a.dataset.platform = p.platform || 'custom';
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = p.platform === 'custom' ? (p.customLabel || '•') : '';
    a.setAttribute('aria-label', p.platform || 'link');
    container.appendChild(a);
  }
});

registerRenderer('M-accordion', (m, def, skin) => {
  if (!m.el) return;
  let root = m.el.querySelector('.fvcms-accordion');
  if (!root) {
    root = document.createElement('div');
    root.className = 'fvcms-accordion fvcms-accordion-' + (m.config.style || 'separated');
    m.el.appendChild(root);
  }
  root.innerHTML = '';
  for (const item of m.config.items || []) {
    const det = document.createElement('details');
    det.className = 'fvcms-accordion-item';
    if (item.defaultOpen) det.open = true;
    const sum = document.createElement('summary');
    sum.textContent = item.title || '';
    det.appendChild(sum);
    const content = document.createElement('div');
    content.className = 'fvcms-accordion-content';
    content.textContent = item.content || '';
    det.appendChild(content);
    root.appendChild(det);
  }
});

registerRenderer('M-icon-list', (m, def, skin) => {
  if (!m.el) return;
  let list = m.el.querySelector('ul');
  if (!list) {
    list = document.createElement('ul');
    list.className = 'fvcms-icon-list';
    m.el.appendChild(list);
  }
  list.innerHTML = '';
  for (const item of m.config.items || []) {
    const li = document.createElement('li');
    if (item.href) {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label || '';
      li.appendChild(a);
    } else {
      li.textContent = item.label || '';
    }
    list.appendChild(li);
  }
});

// Subscribe renderer to store changes (auto re-render on edit)
let _subscribed = false;
export function subscribeToStore() {
  if (_subscribed) return;
  _subscribed = true;
  const store = getStore();
  const origUpdateField = store.updateField.bind(store);
  store.updateField = function (id, field, value) {
    const result = origUpdateField(id, field, value);
    if (field === '__replace__') {
      // Full config replace — re-render this module
      renderModule(id);
    } else if (result) {
      // Single field update — re-render if it's a known renderable field
      renderModule(id);
    }
    return result;
  };
  const origPutModule = store.putModule.bind(store);
  store.putModule = function (m) {
    origPutModule(m);
    renderModule(m.id);
  };
}