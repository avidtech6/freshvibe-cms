// skins/reign.js — Reign-style skin (default Oscar look)
// Sharp corners, serif headings, green palette.

export const reignSkin = {
  id: 'skin-reign',
  label: 'Reign (default)',
  description: 'Sharp corners, serif headings, forest green palette. The current Oscar look.',
  cssTokens: {
    '--heading-color': '#1a2818',
    '--heading-font': 'Georgia, serif',
    '--body-color': '#2a2a2a',
    '--body-font': 'system-ui, sans-serif',
    '--cta-bg': '#2d4f2d',
    '--cta-color': '#ffffff',
    '--cta-radius': '4px',
    '--heading-size-small': '0.875rem',
    '--heading-size-medium': '1rem',
    '--heading-size-large': '1.5rem',
    '--heading-size-xlarge': '2.5rem',
  },
  moduleDefaults: {
    'M-cta': {
      variant: 'solid',
      color: '#2d4f2d',
      radius: 'sharp',
      size: 'medium',
    },
    'M-heading': {
      align: 'left',
      size: 'large',
    },
    'M-image': {
      aspectRatio: 'natural',
      width: 'auto',
    },
  },
};