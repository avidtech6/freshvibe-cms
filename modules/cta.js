// modules/cta.js — canonical CTA (call-to-action) module
// Used by: every clickable button/link that drives the user to an action.

export const ctaModule = {
  id: 'M-cta',
  label: 'CTA button',
  description: 'A call-to-action button. Text + link + style.',
  schema: {
    text: {
      type: 'string',
      label: 'Button text',
      required: true,
      default: 'Learn more',
    },
    href: {
      type: 'url',
      label: 'Link target',
      required: true,
      default: '/',
    },
    variant: {
      type: 'select',
      label: 'Style variant',
      options: ['solid', 'outline', 'ghost', 'link'],
      default: 'solid',
    },
    color: {
      type: 'color',
      label: 'Accent colour',
      default: null,
    },
    radius: {
      type: 'select',
      label: 'Corner radius',
      options: ['sharp', 'small', 'medium', 'large', 'pill'],
      default: 'medium',
    },
    size: {
      type: 'select',
      label: 'Button size',
      options: ['small', 'medium', 'large'],
      default: 'medium',
    },
    openInNewTab: {
      type: 'boolean',
      label: 'Open in new tab',
      default: false,
    },
    icon: {
      type: 'select',
      label: 'Trailing icon',
      options: ['none', 'arrow-right', 'arrow-left', 'external', 'download'],
      default: 'none',
    },
  },
  defaultConfig: {
    text: 'Learn more',
    href: '/',
    variant: 'solid',
    color: null,
    radius: 'medium',
    size: 'medium',
    openInNewTab: false,
    icon: 'none',
  },
  editor: 'editor-form-fields',
};

ctaModule.variants = [
  {
    id: 'primary',
    label: 'Primary action',
    config: { variant: 'solid', radius: 'medium', size: 'medium' },
  },
  {
    id: 'secondary',
    label: 'Secondary action',
    config: { variant: 'outline', radius: 'medium', size: 'medium' },
  },
  {
    id: 'ghost',
    label: 'Subtle / tertiary',
    config: { variant: 'ghost', radius: 'medium', size: 'small' },
  },
  {
    id: 'hero-cta',
    label: 'Hero CTA (large)',
    config: { variant: 'solid', radius: 'large', size: 'large' },
  },
];