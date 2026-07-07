// modules/testimonial.js — canonical Testimonial module
// Used by: EAEL testimonial widget, premium-addon-testimonials.

export const testimonialModule = {
  id: 'M-testimonial',
  label: 'Testimonial',
  description: 'A pull-quote with attribution. Avatar optional.',
  schema: {
    quote: {
      type: 'string',
      label: 'Quote',
      required: true,
      default: '',
    },
    authorName: {
      type: 'string',
      label: 'Author name',
      required: true,
      default: '',
    },
    authorRole: {
      type: 'string',
      label: 'Author role / organisation',
      default: '',
    },
    authorImage: {
      type: 'image',
      label: 'Author avatar',
      default: null,
    },
    rating: {
      type: 'select',
      label: 'Star rating (0 = none)',
      options: ['0', '1', '2', '3', '4', '5'],
      default: '5',
    },
    style: {
      type: 'select',
      label: 'Style',
      options: ['plain', 'card', 'bordered'],
      default: 'card',
    },
  },
  defaultConfig: {
    quote: '',
    authorName: '',
    authorRole: '',
    authorImage: null,
    rating: '5',
    style: 'card',
  },
  editor: 'editor-form-fields',
};

testimonialModule.variants = [
  { id: 'card', label: 'Card', config: { style: 'card' } },
  { id: 'plain', label: 'Plain quote', config: { style: 'plain' } },
  { id: 'bordered', label: 'Bordered pull-quote', config: { style: 'bordered' } },
];