// modules/index.js — canonical module library barrel
// v0.4: 15 modules total.

import { headingModule } from './heading.js';
import { buttonModule } from './button.js';
import { ctaModule } from './cta.js';
import { imageModule } from './image.js';
import { paragraphModule } from './paragraph.js';
import { videoModule } from './video.js';
import { carouselModule } from './carousel.js';
import { menuModule } from './menu.js';
import { socialIconsModule } from './social-icons.js';
import { accordionModule } from './accordion.js';
import { iconListModule } from './icon-list.js';
import { infoBoxModule } from './info-box.js';
import { contactFormModule } from './contact-form.js';
import { breadcrumbModule } from './breadcrumb.js';
import { testimonialModule } from './testimonial.js';
import { ctaBoxModule } from './cta-box.js';

export const CANONICAL_MODULES = [
  headingModule,
  buttonModule,
  ctaModule,
  imageModule,
  paragraphModule,
  videoModule,
  carouselModule,
  menuModule,
  socialIconsModule,
  accordionModule,
  iconListModule,
  infoBoxModule,
  contactFormModule,
  breadcrumbModule,
  testimonialModule,
  ctaBoxModule,
];

export const CANONICAL_MODULES_BY_ID = {};
for (const m of CANONICAL_MODULES) CANONICAL_MODULES_BY_ID[m.id] = m;

export function getModuleDef(id) {
  if (!id) return null;
  // Match by id with or without 'M-' prefix (heading vs M-heading).
  if (CANONICAL_MODULES_BY_ID[id]) return CANONICAL_MODULES_BY_ID[id];
  const bare = id.replace(/^M-/, '');
  return CANONICAL_MODULES_BY_ID['M-' + bare] || CANONICAL_MODULES_BY_ID[bare] || null;
}

export function listModuleDefs() {
  return CANONICAL_MODULES.slice();
}