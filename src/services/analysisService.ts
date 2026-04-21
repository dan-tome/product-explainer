import { Ingredient, ProductType } from '../types/product';
import { analyzeWithGemini } from './geminiService';
import { checkAllergen } from './allergenService';
import { classifyProductText } from './classifierService';
import { applyInciSynonymsToLabelText } from './inciNormalization';

// Re-export for consumers that need the types
export type { Ingredient, IngredientStatus } from '../types/product';

export const detectProductType = (text: string): ProductType => classifyProductText(text);

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

export const analyzeIngredients = async (text: string): Promise<Ingredient[]> => {
  if (!text) return [];

  const textForParse = applyInciSynonymsToLabelText(text);
  const productType = detectProductType(textForParse);
  const section = extractIngredientsSection(textForParse);
  const tokens = normalizeText(section)
    .split(',')
    .map(i => i.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter(i => i.length > 3 && /^[a-zA-Z]{2}/i.test(i));

  if (tokens.length === 0) return [];

  const geminiResults = await analyzeWithGemini(tokens, productType);

  return geminiResults.map(ingredient => {
    const allergenMatch = checkAllergen(ingredient.scientific_name) ?? checkAllergen(ingredient.common_name);
    return {
      ...ingredient,
      allergen_info: {
        is_match: allergenMatch !== null,
        alias_detected: allergenMatch?.allergen ?? null,
      },
    };
  });
};
