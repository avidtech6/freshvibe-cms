// modules/info-box.js — canonical Info box module
// Used by: EAEL info-box widget, generic info-card layouts.

export const infoBoxModule = {
  id: 'M-info-box',
  label: 'Info box',
  description: 'A boxed callout with title, body, icon, and optional link.',
  schema: {
    icon: {
      type: 'string',
      label: 'Icon name',
      default: 'info',
    },
    title: {
      type: 'string',
      label: 'Title',
      required: true,
      default: '',
    },
    body: {
      type: 'string',
      label: 'Body text',
      default: '',
    },
    link: {
      type: 'url',
      label: 'Read more link (optional)',
      default: null,
    },
    linkLabel: {
      type: 'string',
      label: 'Link label',
      default: 'Learn more',
    },
    variant: {
      type: 'select',
      label: 'Variant',
      options: ['info', 'success', 'warning', 'tip'],
      default: 'info',
    },
  },
  defaultConfig: {
    icon: 'info',
    title: '',
    body: '',
    link: null,
    linkLabel: 'Learn more',
    variant: 'info',
  },
  editor: 'editor-form-fields',
};

infoBoxModule.variants = [
  { id: 'tip', label: 'Tip', config: { variant: 'tip', icon: 'bulb' } },
  { id: 'warning', label: 'Warning', config: { variant: 'warning', icon: 'alert' } },
  { id: 'success', label: 'Success', config: { variant: 'success', icon: 'check' } },
];