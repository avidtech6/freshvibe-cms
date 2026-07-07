// modules/index.js — canonical module library barrel
// Importing this file loads the 10 starter modules.
// Add new modules here as the library grows.

import { headingModule } from './heading.js';
import { ctaModule } from './cta.js';
import { imageModule } from './image.js';
import { paragraphModule } from './paragraph.js';
import { videoModule } from './video.js';
import { carouselModule } from './carousel.js';
import { menuModule } from './menu.js';
import { socialIconsModule } from './social-icons.js';
import { accordionModule } from './accordion.js';
import { iconListModule } from './icon-list.js';

export const CANONICAL_MODULES = [
  headingModule,
  ctaModule,
  imageModule,
  paragraphModule,
  videoModule,
  carouselModule,
  menuModule,
  socialIconsModule,
  accordionModule,
  iconListModule,
];

export function getModuleDef(id) {
  return CANONICAL_MODULES.find(m => m.id === id) || null;
}

export function listModuleDefs() {
  return CANONICAL_MODULES.slice();
}