// modules/button.js — canonical Button module.
// "button" is the FvRE-detected type for EAEL creative buttons and
// Elementor button widgets. We map it to the same schema as M-cta so
// the inspector renders a proper text/href/style editor.

export const buttonModule = {
  id: 'M-button',
  label: 'Button',
  description: 'A clickable button. Text + link + style variant. Aliased to CTA under the hood.',
  schema: {
    text: {
      type: 'string',
      label: 'Button text',
      required: true,
      default: 'Click me',
    },
    href: {
      type: 'url',
      label: 'Link target',
      required: true,
      default: '#',
    },
    variant: {
      type: 'select',
      label: 'Style',
      options: ['solid', 'outline', 'ghost'],
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
    alignment: {
      type: 'select',
      label: 'Alignment',
      options: ['left', 'center', 'right'],
      default: 'left',
    },
  },
  render: {
    minHeight: 40,
    minWidth: 100,
    chrome: 'button',
  },
};

buttonModule.variants = [];