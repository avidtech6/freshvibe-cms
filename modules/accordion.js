// modules/accordion.js — canonical Accordion module
// Used by: EAEL adv-accordion widget, EAEL toggle widget, native <details>.

export const accordionModule = {
  id: 'M-accordion',
  label: 'Accordion',
  description: 'A vertical list of collapsible panels. One or many open at once.',
  schema: {
    items: {
      type: 'array',
      label: 'Accordion items',
      itemType: {
        type: 'object',
        fields: {
          title: { type: 'string', label: 'Item title', required: true, default: '' },
          content: { type: 'string', label: 'Item content', default: '' },
          defaultOpen: { type: 'boolean', label: 'Open by default', default: false },
          icon: { type: 'string', label: 'Icon name (optional)', default: '' },
        },
      },
      default: [],
    },
    multiOpen: {
      type: 'boolean',
      label: 'Allow multiple open at once',
      default: false,
    },
    style: {
      type: 'select',
      label: 'Visual style',
      options: ['separated', 'bordered', 'flush'],
      default: 'separated',
    },
    iconPosition: {
      type: 'select',
      label: 'Toggle icon position',
      options: ['left', 'right'],
      default: 'right',
    },
  },
  defaultConfig: {
    items: [],
    multiOpen: false,
    style: 'separated',
    iconPosition: 'right',
  },
  editor: 'editor-form-fields',
};

accordionModule.variants = [
  { id: 'faq', label: 'FAQ (one open at a time)', config: { multiOpen: false, style: 'bordered' } },
  { id: 'multi-faq', label: 'Multi-open FAQ', config: { multiOpen: true, style: 'bordered' } },
  { id: 'flush-list', label: 'Flush list (no chrome)', config: { multiOpen: true, style: 'flush' } },
];