// modules/contact-form.js — canonical Contact form module
// Used by: EAEL weform, Elementor form, generic contact forms.

export const contactFormModule = {
  id: 'M-contact-form',
  label: 'Contact form',
  description: 'A lead-capture form. Fields + submit button. Backend target configurable.',
  schema: {
    fields: {
      type: 'array',
      label: 'Form fields',
      itemType: {
        type: 'object',
        fields: {
          name: { type: 'string', label: 'Field name', default: '' },
          label: { type: 'string', label: 'Display label', default: '' },
          type: {
            type: 'select',
            label: 'Field type',
            options: ['text', 'email', 'tel', 'textarea', 'select', 'checkbox'],
            default: 'text',
          },
          required: { type: 'boolean', label: 'Required', default: false },
          options: { type: 'string', label: 'Options (comma-separated, for select)', default: '' },
        },
      },
      default: [
        { name: 'name', label: 'Your name', type: 'text', required: true, options: '' },
        { name: 'email', label: 'Email address', type: 'email', required: true, options: '' },
        { name: 'message', label: 'Message', type: 'textarea', required: false, options: '' },
      ],
    },
    submitLabel: {
      type: 'string',
      label: 'Submit button text',
      default: 'Send',
    },
    submitEndpoint: {
      type: 'url',
      label: 'Submit endpoint (URL)',
      default: null,
    },
    successMessage: {
      type: 'string',
      label: 'Success message',
      default: 'Thanks! We will be in touch.',
    },
    layout: {
      type: 'select',
      label: 'Layout',
      options: ['stacked', 'inline'],
      default: 'stacked',
    },
  },
  defaultConfig: {
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, options: '' },
      { name: 'email', label: 'Email address', type: 'email', required: true, options: '' },
      { name: 'message', label: 'Message', type: 'textarea', required: false, options: '' },
    ],
    submitLabel: 'Send',
    submitEndpoint: null,
    successMessage: 'Thanks! We will be in touch.',
    layout: 'stacked',
  },
  editor: 'editor-form-fields',
};

contactFormModule.variants = [
  { id: 'contact', label: 'Contact form', config: { layout: 'stacked' } },
  { id: 'subscribe', label: 'Subscribe (email only)', config: { layout: 'inline' } },
  { id: 'feedback', label: 'Quick feedback', config: { layout: 'inline' } },
];