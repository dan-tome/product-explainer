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

/**
 * Compound ingredients are flattened, not discarded: "Noodles (Wheat Flour, Egg)" yields
 * noodles, wheat flour, egg. Labels often declare allergens only inside the parentheses,
 * and anything dropped here can never be explained or flagged downstream.
 * Brackets become separators, which also tolerates unbalanced OCR output.
 */
const normalizeText = (text: string): string =>
  text.replace(/[()[\]|\n\r]+/g, ',').replace(/,{2,}/g, ',');

const MIN_TOKEN_LENGTH = 3; // keeps short allergens and foods: egg, soy, oat

/**
 * Deterministic, pre-LLM half of the pipeline: INCI normalise → classify → extract → tokenise.
 * Exported so the offline eval tier can score it without calling Gemini.
 */
export const prepareLabel = (text: string): { productType: ProductType; tokens: string[] } => {
  const textForParse = applyInciSynonymsToLabelText(text);
  const productType = detectProductType(textForParse);
  const section = extractIngredientsSection(textForParse);
  const tokens = normalizeText(section)
    .split(',')
    .map(i => i.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter(i => i.length >= MIN_TOKEN_LENGTH && /^[a-zA-Z]{2}/i.test(i));
  return { productType, tokens: [...new Set(tokens)] };
};

export const analyzeIngredients = async (text: string): Promise<Ingredient[]> => {
  if (!text) return [];

  const { productType, tokens } = prepareLabel(text);

  if (tokens.length === 0) return [];

  const geminiResults = await analyzeWithGemini(tokens, productType);

  return geminiResults.map(ingredient => {
    const allergenMatch =
      checkAllergen(ingredient.scientific_name) ?? checkAllergen(ingredient.common_name);
    return {
      ...ingredient,
      allergen_info: {
        is_match: allergenMatch !== null,
        alias_detected: allergenMatch?.allergen ?? null,
      },
    };
  });
};
