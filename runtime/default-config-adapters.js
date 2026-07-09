// runtime/default-config-adapters.js — default config-from-DOM adapters
// for the 10 built-in FreshVibe CMS module types. These are framework-
// agnostic: they work for any host site that has a sensible DOM structure.
//
// They extract canonical config fields by walking standard HTML tags
// (h1-h6, p, img, a, etc.). Host apps can register their own adapters
// on top if they have framework-specific class names to detect.
//
// These are auto-registered when the runtime is loaded.

import { registerConfigAdapter } from './config-from-dom.js';

function registerDefaults() {
  // Heading: take first h1-h6 inside the element
  registerConfigAdapter('heading', (m) => {
    const h = m.el.querySelector('h1, h2, h3, h4, h5, h6');
    if (!h) return {};
    const cfg = { text: (h.textContent || '').trim(), level: h.tagName.toLowerCase() };
    const align = h.style.textAlign || getComputedStyle(h).textAlign;
    if (align && ['left','center','right','justify'].includes(align)) cfg.align = align;
    return cfg;
  });

  // Paragraph: take first <p>
  registerConfigAdapter('paragraph', (m) => {
    const p = m.el.querySelector('p');
    return p ? { text: p.innerHTML || p.textContent || '' } : {};
  });

  // Image: take first <img>
  registerConfigAdapter('image', (m) => {
    const img = m.el.querySelector('img');
    if (!img) return {};
    const cfg = { src: img.getAttribute('src') || '', alt: img.getAttribute('alt') || '' };
    const link = img.closest('a');
    if (link) cfg.link = link.getAttribute('href') || '';
    return cfg;
  });

  // CTA / Button: take first <a> inside
  registerConfigAdapter('cta', (m) => {
    const a = m.el.querySelector('a');
    return a ? {
      text: (a.textContent || '').trim(),
      href: a.getAttribute('href') || '#',
      openInNewTab: a.target === '_blank',
    } : {};
  });
  registerConfigAdapter('button', (m) => {
    // Buttons are often <button> or <a class="...button...">
    const a = m.el.querySelector('a, button');
    return a ? {
      text: (a.textContent || '').trim(),
      href: a.getAttribute('href') || '#',
      openInNewTab: a.target === '_blank',
    } : {};
  });

  // Video: take first <video> or <iframe>
  registerConfigAdapter('video', (m) => {
    const v = m.el.querySelector('video');
    if (v) {
      const src = v.querySelector('source')?.getAttribute('src') || v.getAttribute('src');
      return src ? { src, poster: v.getAttribute('poster') || '' } : {};
    }
    const iframe = m.el.querySelector('iframe');
    if (iframe) return { src: iframe.getAttribute('src') || '', embed: 'iframe' };
    return {};
  });

  // Carousel: take items from any repeating child pattern
  registerConfigAdapter('carousel', (m) => {
    // Generic: take direct children that look like slides
    const items = [];
    const slides = m.el.querySelectorAll('[class*="slide"], .swiper-slide, > * > *');
    slides.forEach((s, i) => {
      if (i > 20) return;  // sanity
      const img = s.querySelector('img');
      const txt = s.querySelector('h1, h2, h3, h4, p');
      items.push({
        image: img?.getAttribute('src') || '',
        title: (txt?.textContent || '').trim().slice(0, 80),
      });
    });
    return items.length ? { items } : {};
  });

  // Menu: extract anchors
  registerConfigAdapter('menu', (m) => {
    const items = [];
    m.el.querySelectorAll('a').forEach((a) => {
      const t = (a.textContent || '').trim();
      if (t && t.length < 60 && a.href && !a.href.startsWith('javascript')) {
        items.push({ label: t, href: a.getAttribute('href') || '/', openInNewTab: a.target === '_blank' });
      }
    });
    return items.length ? { items, layout: 'horizontal' } : {};
  });

  // Social icons: take anchors with social-class hints
  registerConfigAdapter('social-icons', (m) => {
    const platforms = [];
    m.el.querySelectorAll('a').forEach((a) => {
      const cls = (a.className || '').toLowerCase();
      let platform = 'custom';
      if (cls.includes('facebook')) platform = 'facebook';
      else if (cls.includes('twitter') || cls.includes('x-twitter')) platform = 'twitter';
      else if (cls.includes('instagram')) platform = 'instagram';
      else if (cls.includes('linkedin')) platform = 'linkedin';
      else if (cls.includes('youtube')) platform = 'youtube';
      else if (cls.includes('tiktok')) platform = 'tiktok';
      platforms.push({ platform, url: a.getAttribute('href') || '#' });
    });
    return platforms.length ? { platforms } : {};
  });

  // Testimonial: try to extract quote / author / role from common patterns
  registerConfigAdapter('testimonial', (m) => {
    const cfg = {};
    const quote = m.el.querySelector('blockquote, [class*="quote"], [class*="testimonial-content"] p, p');
    if (quote) cfg.quote = (quote.textContent || '').trim();
    const name = m.el.querySelector('[class*="name"], cite, [class*="author"]');
    if (name) cfg.authorName = (name.textContent || '').trim();
    const role = m.el.querySelector('[class*="role"], [class*="position"], [class*="job"]');
    if (role) cfg.authorRole = (role.textContent || '').trim();
    const img = m.el.querySelector('img');
    if (img) cfg.authorImage = { url: img.getAttribute('src') || '', alt: img.getAttribute('alt') || '' };
    return cfg;
  });

  // Contact form
  registerConfigAdapter('contact-form', (m) => {
    const form = m.el.querySelector('form');
    if (!form) return {};
    const fields = [];
    form.querySelectorAll('input, textarea, select').forEach((el) => {
      if (el.type === 'submit' || el.type === 'hidden') return;
      fields.push({
        name: el.name || el.id || '',
        label: el.placeholder || el.name || '',
        type: el.tagName.toLowerCase() === 'textarea' ? 'textarea' : (el.type || 'text'),
        required: el.required || false,
      });
    });
    const submit = form.querySelector('[type="submit"]');
    return {
      fields,
      submitLabel: submit ? (submit.textContent || submit.value || 'Send').trim() : 'Send',
    };
  });

  // Accordion / Icon-list / Info-box / Breadcrumb / CTA-box: best-effort
  registerConfigAdapter('accordion', (m) => {
    const items = [];
    m.el.querySelectorAll('details, [class*="accordion-item"], [class*="faq-item"]').forEach((el) => {
      const sum = el.querySelector('summary, [class*="title"], h3, h4');
      const content = el.querySelector('[class*="content"], [class*="body"], p');
      items.push({
        title: (sum?.textContent || '').trim(),
        content: (content?.textContent || '').trim(),
      });
    });
    return items.length ? { items } : {};
  });

  registerConfigAdapter('icon-list', (m) => {
    const items = [];
    m.el.querySelectorAll('li').forEach((li) => {
      const a = li.querySelector('a');
      items.push({
        label: (li.textContent || '').trim(),
        href: a?.getAttribute('href') || '',
        icon: li.querySelector('i, svg')?.outerHTML || '',
      });
    });
    return items.length ? { items } : {};
  });

  registerConfigAdapter('info-box', (m) => {
    const title = m.el.querySelector('[class*="title"], h3, h4');
    const body = m.el.querySelector('[class*="body"], [class*="content"], p');
    const link = m.el.querySelector('a');
    return {
      title: (title?.textContent || '').trim(),
      body: (body?.textContent || '').trim(),
      link: link?.getAttribute('href') || '',
    };
  });

  registerConfigAdapter('breadcrumb', (m) => {
    const items = [];
    m.el.querySelectorAll('a').forEach((a, i) => {
      if (i === 0 && a.getAttribute('href') === '/') return;  // skip home
      items.push({ label: (a.textContent || '').trim(), href: a.getAttribute('href') || '' });
    });
    return items.length ? { items } : {};
  });

  registerConfigAdapter('cta-box', (m) => {
    const title = m.el.querySelector('h1, h2, h3');
    const body = m.el.querySelector('p');
    const a = m.el.querySelector('a');
    return {
      title: (title?.textContent || '').trim(),
      body: (body?.textContent || '').trim(),
      buttonText: (a?.textContent || '').trim(),
      buttonHref: a?.getAttribute('href') || '',
    };
  });
}

let _registered = false;
export function ensureDefaultAdapters() {
  if (_registered) return;
  _registered = true;
  registerDefaults();
}