// skins/buddYx.js — BuddyX-style skin
// Soft rounded corners, sans-serif headings, blue palette.

export const buddyxSkin = {
  id: 'skin-buddYx',
  label: 'BuddyX',
  description: 'Rounded corners, sans-serif headings, soft blue palette. Friendlier feel.',
  cssTokens: {
    '--heading-color': '#1a2e48',
    '--heading-font': '"Inter", system-ui, sans-serif',
    '--body-color': '#333',
    '--body-font': '"Inter", system-ui, sans-serif',
    '--cta-bg': '#3e64ff',
    '--cta-color': '#ffffff',
    '--cta-radius': '24px',
    '--heading-size-small': '0.875rem',
    '--heading-size-medium': '1.125rem',
    '--heading-size-large': '1.75rem',
    '--heading-size-xlarge': '3rem',
  },
  moduleDefaults: {
    'M-cta': {
      variant: 'solid',
      color: '#3e64ff',
      radius: 'large',
      size: 'medium',
    },
    'M-heading': {
      align: 'left',
      size: 'large',
    },
    'M-image': {
      aspectRatio: '4:3',
      width: 'auto',
    },
  },
};