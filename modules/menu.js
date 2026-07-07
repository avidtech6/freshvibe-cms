// modules/menu.js — canonical Menu module
// Used by: EAEL simple-menu widget, simple navigation lists.

export const menuModule = {
  id: 'M-menu',
  label: 'Menu',
  description: 'A simple vertical or horizontal list of links.',
  schema: {
    items: {
      type: 'array',
      label: 'Menu items',
      itemType: {
        type: 'object',
        fields: {
          label: { type: 'string', label: 'Item label', required: true, default: '' },
          href: { type: 'url', label: 'Item link', default: '/' },
          openInNewTab: { type: 'boolean', label: 'Open in new tab', default: false },
        },
      },
      default: [],
    },
    layout: {
      type: 'select',
      label: 'Layout',
      options: ['vertical', 'horizontal'],
      default: 'vertical',
    },
    align: {
      type: 'select',
      label: 'Alignment',
      options: ['left', 'center', 'right'],
      default: 'left',
    },
    showIcons: {
      type: 'boolean',
      label: 'Show icons',
      default: false,
    },
    separator: {
      type: 'select',
      label: 'Separator between items',
      options: ['none', 'dot', 'dash', 'pipe'],
      default: 'none',
    },
  },
  defaultConfig: {
    items: [],
    layout: 'vertical',
    align: 'left',
    showIcons: false,
    separator: 'none',
  },
  editor: 'editor-form-fields',
};

menuModule.variants = [
  { id: 'footer-links', label: 'Footer links', config: { layout: 'vertical', separator: 'none' } },
  { id: 'breadcrumb', label: 'Breadcrumb', config: { layout: 'horizontal', separator: 'pipe' } },
  { id: 'social-row', label: 'Social row', config: { layout: 'horizontal', separator: 'none', showIcons: true } },
];