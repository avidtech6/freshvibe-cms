// modules/carousel.js — canonical Carousel module
// Used by: EAEL post-carousel, team-member-carousel, stacked-cards.
//           Any horizontally-scrolling list of cards.

export const carouselModule = {
  id: 'M-carousel',
  label: 'Carousel',
  description: 'A horizontal scrolling list of items (cards, posts, people, etc.).',
  schema: {
    items: {
      type: 'array',
      label: 'Carousel items',
      itemType: {
        type: 'object',
        fields: {
          title: { type: 'string', label: 'Item title', default: '' },
          subtitle: { type: 'string', label: 'Item subtitle', default: '' },
          image: { type: 'image', label: 'Item image', default: null },
          link: { type: 'url', label: 'Item link', default: null },
          description: { type: 'string', label: 'Item description', default: '' },
        },
      },
      default: [],
    },
    visibleCount: {
      type: 'number',
      label: 'Items visible at once',
      default: 3,
      min: 1,
      max: 8,
    },
    autoRotate: {
      type: 'boolean',
      label: 'Auto-rotate',
      default: false,
    },
    rotateInterval: {
      type: 'number',
      label: 'Rotate interval (ms)',
      default: 5000,
      min: 1000,
      max: 30000,
    },
    showDots: {
      type: 'boolean',
      label: 'Show pagination dots',
      default: true,
    },
    showArrows: {
      type: 'boolean',
      label: 'Show next/prev arrows',
      default: true,
    },
    cardStyle: {
      type: 'select',
      label: 'Card style',
      options: ['plain', 'shadowed', 'bordered', 'floating'],
      default: 'shadowed',
    },
    imageAspect: {
      type: 'select',
      label: 'Card image aspect ratio',
      options: ['natural', '1:1', '4:3', '16:9'],
      default: '4:3',
    },
  },
  defaultConfig: {
    items: [],
    visibleCount: 3,
    autoRotate: false,
    rotateInterval: 5000,
    showDots: true,
    showArrows: true,
    cardStyle: 'shadowed',
    imageAspect: '4:3',
  },
  editor: 'editor-form-fields',
};

carouselModule.variants = [
  {
    id: 'post-carousel',
    label: 'Post carousel (blog)',
    config: { visibleCount: 3, cardStyle: 'shadowed', imageAspect: '4:3' },
  },
  {
    id: 'people-carousel',
    label: 'People carousel (round avatars)',
    config: { visibleCount: 4, cardStyle: 'plain', imageAspect: '1:1' },
  },
  {
    id: 'feature-strip',
    label: 'Feature strip (single row, no dots)',
    config: { visibleCount: 4, cardStyle: 'bordered', showDots: false, imageAspect: '4:3' },
  },
];