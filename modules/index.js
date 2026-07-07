// modules/index.js — canonical module library barrel
// Importing this file loads the 3 starter modules.
// Add new modules here as the library grows.

import { headingModule } from './heading.js';
import { ctaModule } from './cta.js';
import { imageModule } from './image.js';

export const CANONICAL_MODULES = [
  headingModule,
  ctaModule,
  imageModule,
];

export function getModuleDef(id) {
  return CANONICAL_MODULES.find(m => m.id === id) || null;
}

export function listModuleDefs() {
  return CANONICAL_MODULES.slice();
}