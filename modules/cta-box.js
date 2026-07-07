// modules/cta-box.js — canonical CTA Box module
// Used by: EAEL cta-box widget, hero-call-out layouts.

export const ctaBoxModule = {
  id: 'M-cta-box',
  label: 'CTA Box',
  description: 'A boxed call-to-action with a heading, body text, and a button.',
  schema: {
    title: {
      type: 'string',
      label: 'Title',
      required: true,
      default: 'Ready to start?',
    },
    body: {
      type: 'string',
      label: 'Body text',
      default: '',
    },
    buttonText: {
      type: 'string',
      label: 'Button text',
      required: true,
      default: 'Get started',
    },
    buttonHref: {
      type: 'url',
      label: 'Button link',
      required: true,
      default: '/',
    },
    background: {
      type: 'color',
      label: 'Background colour',
      default: null,
    },
    layout: {
      type: 'select',
      label: 'Layout',
      options: ['centered', 'left-aligned', 'side-by-side'],
      default: 'centered',
    },
  },
  defaultConfig: {
    title: 'Ready to start?',
    body: '',
    buttonText: 'Get started',
    buttonHref: '/',
    background: null,
    layout: 'centered',
  },
  editor: 'editor-form-fields',
};

ctaBoxModule.variants = [
  { id: 'newsletter', label: 'Newsletter CTA', config: { title: 'Stay in the loop', buttonText: 'Subscribe' } },
  { id: 'demo', label: 'Book a demo', config: { title: 'See it in action', buttonText: 'Book a demo' } },
  { id: 'pricing', label: 'Pricing CTA', config: { title: 'Pick your plan', buttonText: 'See pricing' } },
];