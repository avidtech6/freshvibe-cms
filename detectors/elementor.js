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
      const groupId = `G-${slug(container.label)}-${i}-${j}`;
      const moduleInstanceId = `MI-${slug(widget.type)}-${i}-${j}`;

      groups.push({
        id: groupId,
        regionId,
        selector: widget.selector,
        order: j,
        isModule: true,
        moduleInstanceId,
        metadata: { detector: 'elementor', rawClass: widget.rawClass },
      });

      const mapped = mapWidgetToModule(widget);
      if (mapped) {
        modules.push({
          id: moduleInstanceId,
          moduleId: mapped.moduleId,
          groupId,
          selector: widget.selector,
          config: mapped.config,
          metadata: { originalWidgetType: widget.type, originalSettings: widget.settings },
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
  const containers = [];
  const re = /<div[^>]*class="[^"]*\be-con\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*\be-con\b|$)/g;
  let m;
  let i = 0;
  while ((m = re.exec(html)) !== null) {
    const fullMatch = m[0];
    const innerHtml = m[1];
    const classMatch = fullMatch.match(/class="([^"]+)"/);
    const classes = classMatch ? classMatch[1].split(/\s+/) : [];
    const hasElementChildren = innerHtml.includes('e-con');
    const label = classes.find(c => c.startsWith('e-con-') && !c.match(/^e-con-\d+$/)) ||
                  classes.find(c => c.startsWith('elementor-section')) ||
                  `region-${i}`;
    containers.push({
      selector: hasElementChildren ? `.e-con:nth-of-type(${i + 1})` : `.${classes[0]}`,
      html: innerHtml,
      label,
      nested: hasElementChildren,
    });
    i++;
  }
  return containers;
}

function findWidgetsInContainer(containerHtml) {
  const widgets = [];
  const re = /<div[^>]*class="([^"]*elementor-widget\s[^"]*)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  let m;
  while ((m = re.exec(containerHtml)) !== null) {
    const classes = m[1].split(/\s+/);
    const typeClass = classes.find(c => c.startsWith('elementor-widget-'));
    const type = typeClass ? typeClass.replace('elementor-widget-', '') : 'unknown';
    widgets.push({
      type,
      selector: `.${classes.find(c => c.startsWith('elementor-widget-') && c !== 'elementor-widget-container') || classes[0]}`,
      rawClass: m[1],
      settings: extractDataSettings(containerHtml),
    });
  }
  return widgets;
}

function extractDataSettings(html) {
  const m = html.match(/data-settings="([^"]+)"/);
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

function slug(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 32);
}