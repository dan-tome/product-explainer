import { ProductType } from '../types/product';

const FOOD_ANCHORS = ['nutrition facts', 'calories', '% daily value', 'serving size', 'total fat', 'dietary fiber'];
const COSMETIC_ANCHORS = ['inci', 'apply to', 'skin', 'hair', 'rinse', 'lather', 'dermatologist'];
const HOUSEHOLD_ANCHORS = ['surfactant', 'bleach', 'detergent', 'disinfectant', 'cleaning', 'solvent'];

export const classifyProductText = (text: string): ProductType => {
  const normalized = text.toLowerCase();
  if (FOOD_ANCHORS.some(anchor => normalized.includes(anchor))) return 'FOOD';
  if (COSMETIC_ANCHORS.some(anchor => normalized.includes(anchor))) return 'COSMETIC';
  if (HOUSEHOLD_ANCHORS.some(anchor => normalized.includes(anchor))) return 'HOUSEHOLD';
  return 'UNKNOWN';
};
