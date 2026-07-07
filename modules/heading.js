// modules/heading.js — canonical Heading module
// Used by: any text heading on the page, in any region.

export const headingModule = {
  id: 'M-heading',
  label: 'Heading',
  description: 'A text heading (h1–h6). Renders as a semantic heading element.',
  schema: {
    text: {
      type: 'string',
      label: 'Heading text',
      required: true,
      default: '',
    },
    level: {
      type: 'select',
      label: 'Heading level',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      default: 'h2',
    },
    align: {
      type: 'select',
      label: 'Text alignment',
      options: ['left', 'center', 'right'],
      default: 'left',
    },
    color: {
      type: 'color',
      label: 'Text colour',
      default: null,           // null = inherit from skin
    },
    size: {
      type: 'select',
      label: 'Size override',
      options: ['inherit', 'small', 'medium', 'large', 'xlarge'],
      default: 'inherit',
    },
  },
  defaultConfig: {
    text: 'Heading',
    level: 'h2',
    align: 'left',
    color: null,
    size: 'inherit',
  },
  editor: 'editor-text-inline',  // resolved by editor registry
};

// Variants — semantic presets operator can apply quickly
headingModule.variants = [
  {
    id: 'page-title',
    label: 'Page title',
    config: { level: 'h1', align: 'left', size: 'xlarge' },
  },
  {
    id: 'section-heading',
    label: 'Section heading',
    config: { level: 'h2', align: 'left', size: 'large' },
  },
  {
    id: 'card-heading',
    label: 'Card heading',
    config: { level: 'h3', align: 'left', size: 'medium' },
  },
  {
    id: 'centre-hero',
    label: 'Centre hero',
    config: { level: 'h1', align: 'center', size: 'xlarge' },
  },
];