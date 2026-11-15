import type { ProductType } from '../types/product';
import {
  analyzeTokens,
  createGeminiGenerate,
  unexplained,
  type AnalyzedIngredient,
} from '../../shared/analysis/gemini';
import { AnalyzeResponseSchema, type AnalyzeRequest } from '../../shared/contract';

// Re-exported so existing imports keep working; the implementation lives in shared/.
export {
  GEMINI_MAX_ATTEMPTS,
  GEMINI_TIMEOUT_MS,
  INGREDIENT_RESPONSE_SCHEMA,
  joinByToken,
  parseGeminiResponse,
} from '../../shared/analysis/gemini';

export const CLIENT_TIMEOUT_MS = 30_000;

/**
 * Server mode (production): POST tokens to the analysis back end, which holds the Gemini key.
 * Validates the response against the shared contract; one retry on network or 5xx errors.
 */
export const requestAnalysis = async (
  url: string,
  tokens: string[],
  productType: ProductType,
): Promise<AnalyzedIngredient[]> => {
  const body: AnalyzeRequest = { tokens, productType };
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.status >= 500) throw new Error(`analysis server error ${res.status}`);
      if (!res.ok) {
        lastError = new Error(`analysis request rejected ${res.status}`);
        break; // 4xx will not succeed on retry
      }
      const parsed = AnalyzeResponseSchema.safeParse(await res.json());
      if (!parsed.success) {
        lastError = parsed.error;
        break;
      }
      return parsed.data.ingredients;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  console.warn('[analysis] server request failed; showing unexplained ingredients', lastError);
  return unexplained(tokens);
};

/**
 * Entry point used by analysisService. When EXPO_PUBLIC_ANALYSIS_URL is set the app never
 * touches a Gemini key. Without it, falls back to direct mode for local development only.
 */
export const analyzeWithGemini = async (
  ingredients: string[],
  productType: ProductType = 'FOOD',
): Promise<AnalyzedIngredient[]> => {
  if (ingredients.length === 0) return [];

  const serverUrl = process.env.EXPO_PUBLIC_ANALYSIS_URL;
  if (serverUrl) return requestAnalysis(serverUrl, ingredients, productType);

  const generate = createGeminiGenerate(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
  const outcome = await analyzeTokens(ingredients, productType, generate);
  return outcome.ingredients;
};
