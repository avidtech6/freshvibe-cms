// modules/paragraph.js — canonical Paragraph module
// Used by: Elementor text-editor widget, raw <p> blocks.

export const paragraphModule = {
  id: 'M-paragraph',
  label: 'Paragraph',
  description: 'A block of body text. Plain text or simple HTML allowed.',
  schema: {
    text: {
      type: 'string',
      label: 'Body text',
      required: true,
      default: '',
    },
    size: {
      type: 'select',
      label: 'Size',
      options: ['small', 'medium', 'large'],
      default: 'medium',
    },
    align: {
      type: 'select',
      label: 'Alignment',
      options: ['left', 'center', 'right', 'justify'],
      default: 'left',
    },
    color: {
      type: 'color',
      label: 'Text colour',
      default: null,
    },
    maxWidth: {
      type: 'select',
      label: 'Max width',
      options: ['narrow', 'normal', 'wide', 'full'],
      default: 'normal',
    },
  },
  defaultConfig: {
    text: '',
    size: 'medium',
    align: 'left',
    color: null,
    maxWidth: 'normal',
  },
  editor: 'editor-form-fields',
};

paragraphModule.variants = [
  { id: 'lead', label: 'Lead paragraph (large)', config: { size: 'large' } },
  { id: 'caption', label: 'Caption (small)', config: { size: 'small' } },
];