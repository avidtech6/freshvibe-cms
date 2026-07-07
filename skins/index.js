// skins/index.js — sample skins barrel
import { reignSkin } from './reign.js';
import { buddyxSkin } from './buddYx.js';

export const SAMPLE_SKINS = [reignSkin, buddyxSkin];

export function listSampleSkins() {
  return SAMPLE_SKINS.slice();
}