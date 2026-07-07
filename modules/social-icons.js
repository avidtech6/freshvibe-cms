// modules/social-icons.js — canonical Social icons module
// Used by: Elementor social-icons widget, EAEL social equivalents.

export const socialIconsModule = {
  id: 'M-social-icons',
  label: 'Social icons',
  description: 'A row or column of social media icons that link to profiles.',
  schema: {
    platforms: {
      type: 'array',
      label: 'Social platforms',
      itemType: {
        type: 'object',
        fields: {
          platform: {
            type: 'select',
            label: 'Platform',
            options: ['twitter', 'facebook', 'instagram', 'youtube', 'linkedin',
                     'pinterest', 'tiktok', 'threads', 'mastodon', 'bluesky',
                     'github', 'email', 'phone', 'custom'],
            default: 'twitter',
          },
          url: {
            type: 'url',
            label: 'Profile URL or contact',
            required: true,
            default: '',
          },
          customLabel: {
            type: 'string',
            label: 'Custom label (only if platform=custom)',
            default: '',
          },
        },
      },
      default: [],
    },
    shape: {
      type: 'select',
      label: 'Icon shape',
      options: ['circle', 'square', 'rounded'],
      default: 'circle',
    },
    size: {
      type: 'select',
      label: 'Icon size',
      options: ['small', 'medium', 'large'],
      default: 'medium',
    },
    color: {
      type: 'color',
      label: 'Accent colour (null = brand defaults)',
      default: null,
    },
    align: {
      type: 'select',
      label: 'Alignment',
      options: ['left', 'center', 'right'],
      default: 'left',
    },
    layout: {
      type: 'select',
      label: 'Layout',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  },
  defaultConfig: {
    platforms: [],
    shape: 'circle',
    size: 'medium',
    color: null,
    align: 'left',
    layout: 'horizontal',
  },
  editor: 'editor-form-fields',
};

socialIconsModule.variants = [
  { id: 'footer-bar', label: 'Footer bar (horizontal, centred)', config: { layout: 'horizontal', align: 'center' } },
  { id: 'sidebar-list', label: 'Sidebar list (vertical)', config: { layout: 'vertical', align: 'left' } },
];