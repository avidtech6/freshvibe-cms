// modules/icon-list.js — canonical Icon list module
// Used by: Elementor icon-list widget. Each item has an icon + text + link.

export const iconListModule = {
  id: 'M-icon-list',
  label: 'Icon list',
  description: 'A vertical list of items, each with an icon, label, and link.',
  schema: {
    items: {
      type: 'array',
      label: 'List items',
      itemType: {
        type: 'object',
        fields: {
          icon: { type: 'string', label: 'Icon name', default: 'check' },
          label: { type: 'string', label: 'Item label', required: true, default: '' },
          href: { type: 'url', label: 'Item link (optional)', default: null },
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
    iconColor: {
      type: 'color',
      label: 'Icon colour',
      default: null,
    },
    spacing: {
      type: 'select',
      label: 'Spacing between items',
      options: ['tight', 'normal', 'loose'],
      default: 'normal',
    },
  },
  defaultConfig: {
    items: [],
    layout: 'vertical',
    iconColor: null,
    spacing: 'normal',
  },
  editor: 'editor-form-fields',
};

iconListModule.variants = [
  { id: 'feature-list', label: 'Feature list (checkmarks)', config: { iconColor: 'green', spacing: 'normal' } },
  { id: 'info-row', label: 'Info row (horizontal)', config: { layout: 'horizontal', spacing: 'loose' } },
];