// modules/video.js — canonical Video module
// Used by: Elementor video widget, embedded YouTube/Vimeo iframes.

export const videoModule = {
  id: 'M-video',
  label: 'Video',
  description: 'An embedded video player (YouTube, Vimeo, or direct file).',
  schema: {
    source: {
      type: 'select',
      label: 'Source',
      options: ['youtube', 'vimeo', 'file'],
      required: true,
      default: 'youtube',
    },
    url: {
      type: 'url',
      label: 'Video URL',
      required: true,
      default: '',
    },
    poster: {
      type: 'image',
      label: 'Poster image (optional)',
      default: null,
    },
    autoplay: {
      type: 'boolean',
      label: 'Autoplay',
      default: false,
    },
    loop: {
      type: 'boolean',
      label: 'Loop',
      default: false,
    },
    muted: {
      type: 'boolean',
      label: 'Muted by default',
      default: false,
    },
    aspectRatio: {
      type: 'select',
      label: 'Aspect ratio',
      options: ['16:9', '4:3', '1:1', '21:9'],
      default: '16:9',
    },
    caption: {
      type: 'string',
      label: 'Caption (optional)',
      default: '',
    },
  },
  defaultConfig: {
    source: 'youtube',
    url: '',
    poster: null,
    autoplay: false,
    loop: false,
    muted: false,
    aspectRatio: '16:9',
    caption: '',
  },
  editor: 'editor-form-fields',
};

videoModule.variants = [
  { id: 'hero-video', label: 'Hero video (16:9, autoplay muted)', config: { aspectRatio: '16:9', autoplay: true, muted: true, loop: true } },
  { id: 'tutorial', label: 'Tutorial (16:9, click to play)', config: { aspectRatio: '16:9', autoplay: false, muted: false } },
];