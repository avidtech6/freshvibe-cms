// modules/breadcrumb.js — canonical Breadcrumb module
// Used by: EAEL breadcrumbs widget, manual nav-trail layouts.

export const breadcrumbModule = {
  id: 'M-breadcrumb',
  label: 'Breadcrumb',
  description: 'A navigation trail showing the current location in the site hierarchy.',
  schema: {
    items: {
      type: 'array',
      label: 'Trail items',
      itemType: {
        type: 'object',
        fields: {
          label: { type: 'string', label: 'Item label', required: true, default: '' },
          href: { type: 'url', label: 'Item link', default: '/' },
        },
      },
      default: [],
    },
    separator: {
      type: 'select',
      label: 'Separator',
      options: ['/', '›', '»', '·', '|'],
      default: '/',
    },
    homeLabel: {
      type: 'string',
      label: 'Home label',
      default: 'Home',
    },
  },
  defaultConfig: {
    items: [],
    separator: '/',
    homeLabel: 'Home',
  },
  editor: 'editor-form-fields',
};