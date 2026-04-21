import { analyzeWithGemini } from './geminiService';

export type IngredientStatus = 'safe' | 'warning' | 'avoid' | 'unknown';

export interface IngredientAnalysis {
  name: string;
  status: IngredientStatus;
  info: string;
}

const extractIngredientsSection = (text: string): string => {
  const match = text.match(/ingredients[:\s]+(.+?)(?:\n{2,}|allergen|contains:|nutrition|$)/is);
  return match ? match[1] : text;
};

const removeParentheticals = (text: string): string => {
  let result = text;
  let prev = '';
  while (prev !== result) {
    prev = result;
    result = result.replace(/\([^()]*\)/g, '').replace(/\[[^\[\]]*\]/g, '');
  }
  return result;
};

const normalizeText = (text: string): string =>
  removeParentheticals(text)
    .replace(/[|\n\r]+/g, ',')
    .replace(/,{2,}/g, ',');

export const analyzeIngredients = async (text: string): Promise<IngredientAnalysis[]> => {
  if (!text) return [];

  const section = extractIngredientsSection(text);
  const ingredients = normalizeText(section)
    .split(',')
    .map(i => i.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter(i => i.length > 3 && /^[a-zA-Z]{2}/i.test(i));

  if (ingredients.length === 0) return [];

  return analyzeWithGemini(ingredients);
};
