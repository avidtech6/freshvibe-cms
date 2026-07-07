// modules/image.js — canonical Image module
// Used by: any standalone image on the page.

export const imageModule = {
  id: 'M-image',
  label: 'Image',
  description: 'A standalone image. Source + alt + size + alignment.',
  schema: {
    src: {
      type: 'image',
      label: 'Image source',
      required: true,
      default: '',
    },
    alt: {
      type: 'string',
      label: 'Alt text (accessibility)',
      default: '',
    },
    width: {
      type: 'select',
      label: 'Display width',
      options: ['auto', '25%', '50%', '75%', '100%'],
      default: 'auto',
    },
    align: {
      type: 'select',
      label: 'Alignment',
      options: ['left', 'center', 'right'],
      default: 'left',
    },
    aspectRatio: {
      type: 'select',
      label: 'Aspect ratio (forces crop)',
      options: ['natural', '1:1', '4:3', '16:9', '21:9'],
      default: 'natural',
    },
    caption: {
      type: 'string',
      label: 'Caption (optional)',
      default: '',
    },
    link: {
      type: 'url',
      label: 'Wrap in link (optional)',
      default: null,
    },
  },
  defaultConfig: {
    src: '',
    alt: '',
    width: 'auto',
    align: 'left',
    aspectRatio: 'natural',
    caption: '',
    link: null,
  },
  editor: 'editor-form-fields',
};

imageModule.variants = [
  {
    id: 'full-bleed',
    label: 'Full-width',
    config: { width: '100%', align: 'center' },
  },
  {
    id: 'inline',
    label: 'Inline (with text)',
    config: { width: '50%', align: 'left' },
  },
  {
    id: 'thumbnail',
    label: 'Thumbnail',
    config: { width: '25%', align: 'left', aspectRatio: '1:1' },
  },
];