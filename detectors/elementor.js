// detectors/elementor.js — Elementor + EAEL detector
// Reads rendered DOM (HTML string), produces annotation that conforms
// to the runtime data model.
//
// This is the ONLY file in the runtime that knows about Elementor.
// Adding a new stack = adding a new detector with the same shape output.

/**
 * @typedef {Object} AnnotationResult
 * @property {Page[]} pages
 * @property {Region[]} regions
 * @property {Group[]} groups
 * @property {ModuleInstance[]} modules
 */

/**
 * Detect Elementor + EAEL modules in a page's rendered HTML.
 *
 * @param {Object} opts
 * @param {string} opts.pathname - e.g. "/", "/about/"
 * @param {string} opts.html - the full HTML of the page
 * @returns {AnnotationResult}
 */
export function detectElementor({ pathname, html }) {
  const pageId = 'p-' + (pathname.replace(/\//g, '_').replace(/^_|_$/g, '') || 'root');
  const regions = [];
  const groups = [];
  const modules = [];

  // 1. Find top-level .e-con containers — these become Regions
  const eConMatches = findTopLevelContainers(html);
  eConMatches.forEach((container, i) => {
    const regionId = `R-${slug(container.label)}-${i}`;
    regions.push({
      id: regionId,
      pageId,
      label: container.label || `Section ${i + 1}`,
      selector: container.selector,
      order: i,
      metadata: {},
    });

    // 2. Find elementor widgets inside each container — these become Groups + Modules
    const widgets = findWidgetsInContainer(container.html);
    widgets.forEach((widget, j) => {
      // Composite ID: pageId + dataId ensures uniqueness across pages.
      // (Same header menu on every page has the same data-id; we want
      //  a separate annotation per page so editing one page doesn't
      //  silently affect all others.)
      const idSuffix = widget.dataId
        ? `${pageId.replace(/^p-/, '')}_${widget.dataId}`
        : `${i}-${j}`;
      const groupId = `G-${idSuffix}`;
      const moduleInstanceId = `MI-${idSuffix}`;

      groups.push({
        id: groupId,
        regionId,
        selector: widget.selector,
        order: j,
        isModule: true,
        moduleInstanceId,
        metadata: { detector: 'elementor', rawClass: widget.rawClass, dataId: widget.dataId },
      });

      const mapped = mapWidgetToModule(widget);
      if (mapped) {
        modules.push({
          id: moduleInstanceId,
          moduleId: mapped.moduleId,
          groupId,
          selector: widget.selector,
          config: mapped.config,
          metadata: { originalWidgetType: widget.type, originalSettings: widget.settings, dataId: widget.dataId },
        });
      }
    });
  });

  const pages = [{
    id: pageId,
    pathname,
    label: pathname === '/' ? 'Home' : pathname.replace(/^\/|\/$/g, '').replace(/-/g, ' ') || 'Page',
    regionIds: regions.map(r => r.id),
    metadata: {},
  }];

  return { pages, regions, groups, modules };
}

// ---- internals ----

function findTopLevelContainers(html) {
  // Find the OUTERMOST e-con containers only. Nested e-cons become
  // part of the parent's content (and their widgets are detected
  // recursively by findWidgetsInContainer).
  const containers = [];
  const openTagRe = /<div\b[^>]*class="[^"]*\be-con\b[^"]*"[^>]*>/g;
  let m;
  const openPositions = [];
  while ((m = openTagRe.exec(html)) !== null) {
    openPositions.push({ start: m.index, openTagEnd: m.index + m[0].length, tag: m[0] });
  }
  for (let i = 0; i < openPositions.length; i++) {
    const start = openPositions[i].openTagEnd;
    // Walk forward counting <div> / </div> to find this container's matching close
    let depth = 1;
    let pos = start;
    const closeRe = /<\/?div\b/g;
    closeRe.lastIndex = pos;
    while (depth > 0) {
      closeRe.lastIndex = pos;
      const next = closeRe.exec(html);
      if (!next) break;
      if (next[0].startsWith('</')) {
        depth--;
        pos = next.index + next[0].length;
      } else {
        depth++;
        pos = next.index + next[0].length;
      }
    }
    const innerHtml = html.substring(start, pos - 6);
    const tag = openPositions[i].tag;
    const classMatch = tag.match(/class="([^"]+)"/);
    const classes = classMatch ? classMatch[1].split(/\s+/) : [];
    const label = classes.find(c => c.startsWith('e-con-') && !c.match(/^e-con-\d+$/)) ||
                  `region-${i}`;
    // Check: is this e-con nested INSIDE a previously-captured container?
    const isNested = containers.some(c =>
      openPositions[i].start > c.startOffset && openPositions[i].start < c.endOffset
    );
    if (isNested) continue; // skip — handled by parent's walker
    containers.push({
      selector: `.${classes[0]}`,
      html: innerHtml,
      label,
      startOffset: openPositions[i].start,
      endOffset: pos,
    });
  }
  return containers;
}

function findWidgetsInContainer(containerHtml) {
  const widgets = [];
  const seen = new Set();
  // Elementor widget wrapper: <div class="elementor-element ..." data-id="abc123" ... data-widget_type="image.default">
  const re = /<div\s[^>]*?class="([^"]*elementor-element[^"]*)"([^>]*)>/g;
  let m;
  while ((m = re.exec(containerHtml)) !== null) {
    const fullAttrs = m[2];
    // Extract data-id
    const dataIdMatch = fullAttrs.match(/data-id="([a-z0-9]+)"/);
    if (!dataIdMatch) continue;
    const dataId = dataIdMatch[1];
    if (seen.has(dataId)) continue;
    // Extract data-widget_type
    const widgetTypeMatch = fullAttrs.match(/data-widget_type="([^"]+)"/);
    const widgetType = widgetTypeMatch ? widgetTypeMatch[1] : '';
    // Skip non-widget element types (sections, columns, containers)
    if (!widgetType || widgetType === 'global') continue;
    const type = widgetType.split('.')[0]; // 'image.default' → 'image'
    if (!type) continue;
    seen.add(dataId);
    const settings = extractDataSettings(fullAttrs);
    widgets.push({
      type,
      dataId,
      selector: `[data-id="${dataId}"]`,
      rawClass: m[1],
      settings,
    });
  }
  return widgets;
}

function extractDataSettings(attrsString) {
  const m = attrsString.match(/data-settings="([^"]+)"/);
  if (!m) return {};
  try {
    return JSON.parse(m[1].replace(/&quot;/g, '"'));
  } catch (e) {
    return {};
  }
}

// Map Elementor widget types to canonical module ids + extract config
function mapWidgetToModule(widget) {
  const s = widget.settings || {};
  switch (widget.type) {
    case 'heading':
    case 'animated-headline':
      return {
        moduleId: 'M-heading',
        config: {
          text: s.title || s.animated_text || '',
          level: 'h' + (s.header_size || '2'),
          align: s.align || 'left',
          color: null,
          size: 'inherit',
        },
      };

    case 'button':
    case 'eael-creative-button':
      return {
        moduleId: 'M-cta',
        config: {
          text: s.text || '',
          href: s.link?.url || '/',
          variant: 'solid',
          color: null,
          radius: 'medium',
          size: 'medium',
          openInNewTab: !!s.link?.is_external,
          icon: 'none',
        },
      };

    case 'image':
    case 'eael-image':
      return {
        moduleId: 'M-image',
        config: {
          src: s.image?.url || '',
          alt: s.image?.alt || '',
          width: 'auto',
          align: 'left',
          aspectRatio: 'natural',
          caption: '',
          link: null,
        },
      };

    case 'text-editor':
      return {
        moduleId: 'M-paragraph',
        config: {
          text: stripHtml(s.editor || ''),
          size: 'medium',
          align: s.align || 'left',
          color: null,
          maxWidth: 'normal',
        },
      };

    case 'video':
    case 'eael-video':
      return {
        moduleId: 'M-video',
        config: {
          source: detectVideoSource(s.youtube_url || s.vimeo_url || s.hosted_url || ''),
          url: s.youtube_url || s.vimeo_url || s.hosted_url || '',
          poster: s.cover_image?.url ? { url: s.cover_image.url } : null,
          autoplay: !!s.autoplay,
          loop: !!s.loop,
          muted: !!s.mute,
          aspectRatio: s.aspect_ratio || '16:9',
          caption: '',
        },
      };

    case 'eael-post-carousel':
    case 'eael-team-member-carousel':
    case 'eael-stacked-cards':
      return {
        moduleId: 'M-carousel',
        config: {
          items: extractCarouselItems(s),
          visibleCount: parseInt(s.slides_to_show || '3', 10),
          autoRotate: !!s.autoplay,
          rotateInterval: (parseInt(s.autoplay_speed || '5000', 10)),
          showDots: s.dots !== 'no',
          showArrows: s.arrows !== 'no',
          cardStyle: 'shadowed',
          imageAspect: '4:3',
        },
      };

    case 'eael-simple-menu':
      return {
        moduleId: 'M-menu',
        config: {
          items: extractMenuItems(s),
          layout: s.menu_layout === 'horizontal' ? 'horizontal' : 'vertical',
          align: 'left',
          showIcons: false,
          separator: 'none',
        },
      };

    case 'social-icons':
      return {
        moduleId: 'M-social-icons',
        config: {
          platforms: extractSocialPlatforms(s),
          shape: 'circle',
          size: 'medium',
          color: null,
          align: 'left',
          layout: 'horizontal',
        },
      };

    case 'eael-adv-accordion':
    case 'eael-toggle':
      return {
        moduleId: 'M-accordion',
        config: {
          items: extractAccordionItems(s),
          multiOpen: !!s.accordion_toggle,
          style: 'separated',
          iconPosition: 'right',
        },
      };

    case 'icon-list':
      return {
        moduleId: 'M-icon-list',
        config: {
          items: extractIconListItems(s),
          layout: 'vertical',
          iconColor: null,
          spacing: 'normal',
        },
      };

    case 'eael-info-box':
      return {
        moduleId: 'M-info-box',
        config: {
          icon: s.icon?.value || 'info',
          title: s.title || '',
          body: stripHtml(s.description || ''),
          link: s.link?.url || null,
          linkLabel: s.read_more_text || 'Learn more',
          variant: 'info',
        },
      };

    case 'eael-cta-box':
      return {
        moduleId: 'M-cta-box',
        config: {
          title: s.title || '',
          body: stripHtml(s.description || ''),
          buttonText: s.button_text || s.cta_text || '',
          buttonHref: s.button_url?.url || s.link?.url || '/',
          background: s.background_color || null,
          layout: 'centered',
        },
      };

    case 'eael-breadcrumbs':
      return {
        moduleId: 'M-breadcrumb',
        config: {
          items: parseBreadcrumbItems(s),
          separator: '/',
          homeLabel: 'Home',
        },
      };

    case 'premium-addon-testimonials':
    case 'eael-testimonial':
      return {
        moduleId: 'M-testimonial',
        config: {
          quote: stripHtml(s.description || s.testimonial_content || s.content || ''),
          authorName: s.name || s.author || '',
          authorRole: s.role || s.position || '',
          authorImage: s.image?.url ? { url: s.image.url } : null,
          rating: '5',
          style: 'card',
        },
      };

    case 'form':
    case 'eael-weform':
    case 'eael-fluentform':
      return {
        moduleId: 'M-contact-form',
        config: extractFormFields(s),
      };

    default:
      // Widget type we don't have a canonical module for yet.
      // Return null so it's skipped from the annotation but the
      // group still exists for visibility in the navigator.
      return null;
  }
}

// ---- widget config extractors ----

function detectVideoSource(url) {
  if (!url) return 'youtube';
  if (/youtube|youtu\.be/.test(url)) return 'youtube';
  if (/vimeo/.test(url)) return 'vimeo';
  return 'file';
}

function extractCarouselItems(s) {
  // Real Elementor serializes this as posts query args; the resulting
  // HTML contains rendered cards. Without DOM access we get the query.
  return Array.isArray(s.posts) ? s.posts.map(p => ({
    title: p.title || '',
    subtitle: '',
    image: p.image ? { url: p.image } : null,
    link: p.link || null,
    description: '',
  })) : [];
}

function extractMenuItems(s) {
  if (Array.isArray(s.menu_items)) {
    return s.menu_items.map(i => ({
      label: i.label || i.title || '',
      href: i.link?.url || '/',
      openInNewTab: !!i.link?.is_external,
    }));
  }
  return [];
}

function extractSocialPlatforms(s) {
  const iconToPlatform = {
    'fa-twitter': 'twitter', 'fa-x-twitter': 'twitter',
    'fa-facebook': 'facebook', 'fa-facebook-f': 'facebook',
    'fa-instagram': 'instagram',
    'fa-youtube': 'youtube',
    'fa-linkedin': 'linkedin', 'fa-linkedin-in': 'linkedin',
    'fa-pinterest': 'pinterest', 'fa-pinterest-p': 'pinterest',
    'fa-tiktok': 'tiktok',
    'fa-threads': 'threads',
    'fa-mastodon': 'mastodon',
    'fa-github': 'github',
    'fa-envelope': 'email',
    'fa-phone': 'phone',
  };
  if (!Array.isArray(s.social_icon_list)) return [];
  return s.social_icon_list.map(item => {
    const iconClass = item?.social_icon?.value || '';
    const platform = iconToPlatform[iconClass] || 'custom';
    return {
      platform,
      url: item?.link?.url || '',
      customLabel: platform === 'custom' ? (item?.social_icon?.title || iconClass) : '',
    };
  });
}

function extractAccordionItems(s) {
  if (!Array.isArray(s.tabs) && !Array.isArray(s.items)) return [];
  const arr = s.tabs || s.items || [];
  return arr.map(t => ({
    title: t.tab_title || t.title || '',
    content: stripHtml(t.tab_content || t.content || ''),
    defaultOpen: !!t.tab_default_active,
    icon: t.tab_icon?.value || '',
  }));
}

function extractIconListItems(s) {
  if (!Array.isArray(s.icon_list)) return [];
  return s.icon_list.map(i => ({
    icon: i?.selected_icon?.value || '',
    label: i?.text || '',
    href: i?.link?.url || null,
  }));
}

function stripHtml(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function parseBreadcrumbItems(s) {
  if (!Array.isArray(s.breadcrumb_trail)) return [];
  return s.breadcrumb_trail.map(item => ({
    label: item.text || item.label || item.title || '',
    href: item.link || item.url || '/',
  }));
}

function extractFormFields(s) {
  if (Array.isArray(s.form_fields) && s.form_fields.length > 0) {
    return {
      fields: s.form_fields.map(f => ({
        name: f.field_name || f.name || '',
        label: f.field_label || f.label || '',
        type: f.field_type || f.type || 'text',
        required: !!f.required,
        options: Array.isArray(f.options) ? f.options.join(',') : (f.options || ''),
      })),
      submitLabel: s.submit_button_text || 'Send',
      submitEndpoint: s.form_action || null,
      successMessage: s.success_message || 'Thanks!',
      layout: 'stacked',
    };
  }
  return {
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, options: '' },
      { name: 'email', label: 'Email', type: 'email', required: true, options: '' },
      { name: 'message', label: 'Message', type: 'textarea', required: false, options: '' },
    ],
    submitLabel: 'Send',
    submitEndpoint: null,
    successMessage: 'Thanks!',
    layout: 'stacked',
  };
}

function slug(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 32);
}