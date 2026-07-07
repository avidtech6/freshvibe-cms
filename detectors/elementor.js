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
  const pageId = 'p-' + pathname.replace(/\//g, '_').replace(/^_|_$/g, '') || 'p-root';
  const regions = [];
  const groups = [];
  const modules = [];

  // 1. Find top-level .e-con containers — these become Regions
  //    Elementor v4 uses .e-con; v3 uses .elementor-section.
  const eConMatches = findTopLevelContainers(html);
  eConMatches.forEach((container, i) => {
    const regionId = `R-${slug(container.label)}-${i}`;
    regions.push({
      id: regionId,
      pageId,
      label: container.label || `Section ${i + 1}`,
      selector: container.selector,
      order: i,
      // Thread B: empty for v1
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
        isModule: true,                  // every detected widget becomes a module in v1
        moduleInstanceId,
        metadata: { detector: 'elementor', rawClass: widget.rawClass },
      });

      // 3. Map Elementor widget type → canonical module id + extract config
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
    label: pathname === '/' ? 'Home' : pathname.replace(/\//g, '').replace(/-/g, ' '),
    regionIds: regions.map(r => r.id),
    metadata: {},
  }];

  return { pages, regions, groups, modules };
}

// ---- internals ----

function findTopLevelContainers(html) {
  // Match each top-level .e-con with its inner HTML.
  // We use a regex approximation here; for production this should
  // parse the HTML properly (use DOMParser in browser context).
  const containers = [];
  const re = /<div[^>]*class="[^"]*\be-con\b[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
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
  // Elementor widget wrappers: <div class="elementor-widget elementor-widget-heading ...">
  const widgets = [];
  const re = /<div[^>]*class="([^"]*elementor-widget\s[^"]*)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  let m;
  while ((m = re.exec(containerHtml)) !== null) {
    const classes = m[1].split(/\s+/);
    const typeClass = classes.find(c => c.startsWith('elementor-widget-'));
    const type = typeClass ? typeClass.replace('elementor-widget-', '') : 'unknown';
    widgets.push({
      type,
      selector: `.${classes[0]}`,
      rawClass: m[1],
      settings: extractDataSettings(containerHtml),
    });
  }
  return widgets;
}

// Elementor serializes widget config in data-settings="..." attribute
function extractDataSettings(html) {
  const m = html.match(/data-settings="([^"]+)"/);
  if (!m) return {};
  try {
    return JSON.parse(m[1].replace(/&quot;/g, '"'));
  } catch (e) {
    return {};
  }
}

// Map Elementor widget types to canonical module ids + config
function mapWidgetToModule(widget) {
  const s = widget.settings || {};
  switch (widget.type) {
    case 'heading':
      return {
        moduleId: 'M-heading',
        config: {
          text: s.title || '',
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

    default:
      // Widget type we don't have a canonical module for yet
      return null;
  }
}

function slug(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 32);
}