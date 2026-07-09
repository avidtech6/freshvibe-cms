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
  // Also register under the bare id (without M- prefix) so callers
  // that store moduleId as 'heading' can find renderers registered
  // as 'M-heading'.
  const bare = moduleId.replace(/^M-/, '');
  if (bare !== moduleId) RENDERERS[bare] = fn;
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
  // Visual feedback: brief yellow flash so operator sees the element
  // that just got re-rendered. CSS class added + removed after 800ms.
  if (m.el && m.el.classList) {
    m.el.classList.add('oscar-just-updated');
    setTimeout(() => {
      if (m.el && m.el.classList) m.el.classList.remove('oscar-just-updated');
    }, 800);
  }
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
    link.className = 'oscar-cta';
    m.el.appendChild(link);
  }
  if (m.config.text != null) link.textContent = m.config.text;
  if (m.config.href) link.href = m.config.href;
  if (m.config.openInNewTab) link.target = '_blank';
  else link.removeAttribute('target');
  // Variant class
  link.classList.remove('oscar-variant-solid', 'oscar-variant-outline',
    'oscar-variant-ghost', 'oscar-variant-link');
  if (m.config.variant) link.classList.add('oscar-variant-' + m.config.variant);
  // Radius
  link.classList.remove('oscar-radius-sharp', 'oscar-radius-small',
    'oscar-radius-medium', 'oscar-radius-large', 'oscar-radius-pill');
  if (m.config.radius) link.classList.add('oscar-radius-' + m.config.radius);
  // Size
  link.classList.remove('oscar-size-small', 'oscar-size-medium', 'oscar-size-large');
  if (m.config.size) link.classList.add('oscar-size-' + m.config.size);
});

registerRenderer('M-button', (m, def, skin) => {
  if (!m.el) return;
  // Buttons in Elementor/EAEL can be: <a class="...creative-button..."> or <button>
  let link = m.el.querySelector('a.eael-creative-button__link, a.elementor-button-link, a.elementor-button, a');
  if (!link) {
    link = document.createElement('a');
    link.className = 'elementor-button-link elementor-button';
    m.el.appendChild(link);
  }
  if (m.config.text != null) link.textContent = m.config.text;
  if (m.config.href) link.href = m.config.href;
  if (m.config.openInNewTab) link.target = '_blank';
  else link.removeAttribute('target');
  // Variant
  link.classList.remove(
    'eael-creative-button--default', 'eael-creative-button--outline',
    'eael-creative-button--trail', 'eael-creative-button--invert',
    'oscar-variant-solid', 'oscar-variant-outline', 'oscar-variant-ghost'
  );
  if (m.config.variant === 'outline') {
    link.classList.add('eael-creative-button--outline');
  } else if (m.config.variant === 'ghost') {
    link.classList.add('eael-creative-button--trail');
  } else {
    link.classList.add('eael-creative-button--default');
  }
  // Size
  link.classList.remove('eael-creative-button--small', 'eael-creative-button--medium', 'eael-creative-button--large',
    'oscar-size-small', 'oscar-size-medium', 'oscar-size-large');
  const sizeClass = 'eael-creative-button--' + (m.config.size || 'medium');
  link.classList.add(sizeClass);
  // Color (per-instance override)
  if (m.config.color) {
    link.style.backgroundColor = m.config.color;
  }
  // Alignment
  if (m.config.alignment) {
    const align = m.config.alignment;
    if (align === 'center') m.el.style.textAlign = 'center';
    else if (align === 'right') m.el.style.textAlign = 'right';
    else m.el.style.textAlign = 'left';
  }
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
    p.classList.remove('oscar-paragraph-small', 'oscar-paragraph-medium', 'oscar-paragraph-large');
    p.classList.add('oscar-paragraph-' + m.config.size);
  }
});

registerRenderer('M-menu', (m, def, skin) => {
  if (!m.el) return;
  let list = m.el.querySelector('ul');
  if (!list) {
    list = document.createElement('ul');
    list.className = 'oscar-menu';
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
  list.classList.remove('oscar-menu-vertical', 'oscar-menu-horizontal');
  list.classList.add('oscar-menu-' + (m.config.layout || 'vertical'));
});

registerRenderer('M-social-icons', (m, def, skin) => {
  if (!m.el) return;
  let container = m.el.querySelector('.oscar-social-icons');
  if (!container) {
    container = document.createElement('div');
    container.className = 'oscar-social-icons';
    m.el.appendChild(container);
  }
  container.innerHTML = '';
  container.classList.remove('oscar-social-horizontal', 'oscar-social-vertical');
  container.classList.add('oscar-social-' + (m.config.layout || 'horizontal'));
  for (const p of m.config.platforms || []) {
    const a = document.createElement('a');
    a.href = p.url || '#';
    a.className = 'oscar-social-icon';
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
  let root = m.el.querySelector('.oscar-accordion');
  if (!root) {
    root = document.createElement('div');
    root.className = 'oscar-accordion oscar-accordion-' + (m.config.style || 'separated');
    m.el.appendChild(root);
  }
  root.innerHTML = '';
  for (const item of m.config.items || []) {
    const det = document.createElement('details');
    det.className = 'oscar-accordion-item';
    if (item.defaultOpen) det.open = true;
    const sum = document.createElement('summary');
    sum.textContent = item.title || '';
    det.appendChild(sum);
    const content = document.createElement('div');
    content.className = 'oscar-accordion-content';
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
    list.className = 'oscar-icon-list';
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

registerRenderer('M-info-box', (m, def, skin) => {
  if (!m.el) return;
  let box = m.el.querySelector('.oscar-info-box');
  if (!box) {
    box = document.createElement('div');
    box.className = 'oscar-info-box';
    m.el.appendChild(box);
  }
  box.className = 'oscar-info-box oscar-info-' + (m.config.variant || 'info');
  box.innerHTML = '';
  if (m.config.icon) {
    const ico = document.createElement('div');
    ico.className = 'oscar-info-icon';
    ico.textContent = m.config.icon;
    box.appendChild(ico);
  }
  const body = document.createElement('div');
  body.className = 'oscar-info-body';
  if (m.config.title) {
    const t = document.createElement('div');
    t.className = 'oscar-info-title';
    t.textContent = m.config.title;
    body.appendChild(t);
  }
  if (m.config.body) {
    const b = document.createElement('div');
    b.className = 'oscar-info-content';
    b.textContent = m.config.body;
    body.appendChild(b);
  }
  if (m.config.link) {
    const a = document.createElement('a');
    a.className = 'oscar-info-link';
    a.href = m.config.link;
    a.textContent = m.config.linkLabel || 'Learn more';
    body.appendChild(a);
  }
  box.appendChild(body);
});

registerRenderer('M-contact-form', (m, def, skin) => {
  if (!m.el) return;
  let form = m.el.querySelector('form');
  if (!form) {
    form = document.createElement('form');
    form.className = 'oscar-form';
    m.el.appendChild(form);
  }
  form.className = 'oscar-form oscar-form-' + (m.config.layout || 'stacked');
  form.innerHTML = '';
  if (m.config.layout === 'inline') form.classList.add('oscar-form-inline');
  for (const field of m.config.fields || []) {
    const wrap = document.createElement('div');
    wrap.className = 'oscar-form-field';
    const labelEl = document.createElement('label');
    labelEl.textContent = field.label || field.name;
    labelEl.htmlFor = 'oscar-f-' + field.name;
    wrap.appendChild(labelEl);
    let input;
    if (field.type === 'textarea') {
      input = document.createElement('textarea');
    } else if (field.type === 'select') {
      input = document.createElement('select');
      (field.options || '').split(',').forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.trim();
        opt.textContent = o.trim();
        input.appendChild(opt);
      });
    } else if (field.type === 'checkbox') {
      input = document.createElement('input');
      input.type = 'checkbox';
    } else {
      input = document.createElement('input');
      input.type = field.type;
    }
    input.id = 'oscar-f-' + field.name;
    input.name = field.name;
    if (field.required) input.required = true;
    wrap.appendChild(input);
    form.appendChild(wrap);
  }
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'oscar-form-submit';
  submit.textContent = m.config.submitLabel || 'Send';
  form.appendChild(submit);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = document.createElement('div');
    result.className = 'oscar-form-success';
    result.textContent = m.config.successMessage || 'Sent!';
    form.appendChild(result);
    setTimeout(() => result.remove(), 4000);
  });
});

registerRenderer('M-breadcrumb', (m, def, skin) => {
  if (!m.el) return;
  let nav = m.el.querySelector('nav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'oscar-breadcrumb';
    nav.setAttribute('aria-label', 'Breadcrumb');
    m.el.appendChild(nav);
  }
  nav.innerHTML = '';
  const ol = document.createElement('ol');
  ol.className = 'oscar-breadcrumb-list';
  // First item: home
  const homeLi = document.createElement('li');
  const homeA = document.createElement('a');
  homeA.href = '/';
  homeA.textContent = m.config.homeLabel || 'Home';
  homeLi.appendChild(homeA);
  ol.appendChild(homeLi);
  // Separator after home
  const homeSep = document.createElement('li');
  homeSep.className = 'oscar-breadcrumb-sep';
  homeSep.textContent = m.config.separator || '/';
  ol.appendChild(homeSep);
  // User items
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
    ol.appendChild(li);
    const sep = document.createElement('li');
    sep.className = 'oscar-breadcrumb-sep';
    sep.textContent = m.config.separator || '/';
    ol.appendChild(sep);
  }
  nav.appendChild(ol);
});

registerRenderer('M-testimonial', (m, def, skin) => {
  if (!m.el) return;
  let card = m.el.querySelector('.oscar-testimonial');
  if (!card) {
    card = document.createElement('div');
    card.className = 'oscar-testimonial';
    m.el.appendChild(card);
  }
  card.className = 'oscar-testimonial oscar-testimonial-' + (m.config.style || 'card');
  card.innerHTML = '';
  if (m.config.rating && m.config.rating !== '0') {
    const stars = document.createElement('div');
    stars.className = 'oscar-testimonial-stars';
    stars.textContent = '★'.repeat(parseInt(m.config.rating, 10));
    card.appendChild(stars);
  }
  if (m.config.quote) {
    const q = document.createElement('blockquote');
    q.className = 'oscar-testimonial-quote';
    q.textContent = m.config.quote;
    card.appendChild(q);
  }
  const attribution = document.createElement('div');
  attribution.className = 'oscar-testimonial-attribution';
  if (m.config.authorImage && m.config.authorImage.url) {
    const img = document.createElement('img');
    img.src = m.config.authorImage.url;
    img.alt = m.config.authorName || '';
    img.className = 'oscar-testimonial-avatar';
    attribution.appendChild(img);
  }
  const authorText = document.createElement('div');
  if (m.config.authorName) {
    const name = document.createElement('div');
    name.className = 'oscar-testimonial-name';
    name.textContent = m.config.authorName;
    authorText.appendChild(name);
  }
  if (m.config.authorRole) {
    const role = document.createElement('div');
    role.className = 'oscar-testimonial-role';
    role.textContent = m.config.authorRole;
    authorText.appendChild(role);
  }
  attribution.appendChild(authorText);
  card.appendChild(attribution);
});

registerRenderer('M-cta-box', (m, def, skin) => {
  if (!m.el) return;
  let box = m.el.querySelector('.oscar-cta-box');
  if (!box) {
    box = document.createElement('div');
    box.className = 'oscar-cta-box';
    m.el.appendChild(box);
  }
  box.className = 'oscar-cta-box oscar-cta-box-' + (m.config.layout || 'centered');
  if (m.config.background) box.style.background = m.config.background;
  else box.style.background = '';
  box.innerHTML = '';
  const inner = document.createElement('div');
  inner.className = 'oscar-cta-box-inner';
  if (m.config.title) {
    const t = document.createElement('h3');
    t.className = 'oscar-cta-box-title';
    t.textContent = m.config.title;
    inner.appendChild(t);
  }
  if (m.config.body) {
    const b = document.createElement('p');
    b.className = 'oscar-cta-box-body';
    b.textContent = m.config.body;
    inner.appendChild(b);
  }
  if (m.config.buttonText && m.config.buttonHref) {
    const a = document.createElement('a');
    a.className = 'oscar-cta oscar-variant-solid oscar-radius-medium oscar-size-medium';
    a.href = m.config.buttonHref;
    a.textContent = m.config.buttonText;
    inner.appendChild(a);
  }
  box.appendChild(inner);
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