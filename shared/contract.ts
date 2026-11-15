import { z } from 'zod';
import type { Ingredient } from '../src/types/product';

/**
 * Versioned app <-> server contract for POST /analyze. Both sides validate with these schemas.
 * Breaking changes bump CONTRACT_VERSION. Additive optional fields do not.
 */
export const CONTRACT_VERSION = 1;

export const MAX_TOKENS = 80;
export const MAX_TOKEN_LENGTH = 120;

export const ProductTypeSchema = z.enum(['FOOD', 'COSMETIC', 'HOUSEHOLD', 'UNKNOWN']);

export const AnalyzeRequestSchema = z
  .object({
    tokens: z.array(z.string().trim().min(1).max(MAX_TOKEN_LENGTH)).min(1).max(MAX_TOKENS),
    productType: ProductTypeSchema,
  })
  .strict();

export const AnalyzedIngredientSchema = z
  .object({
    scientific_name: z.string(),
    common_name: z.string(),
    functional_purpose: z.string(),
    regulatory_context: z.string(),
    exposure_context: z.string(),
    science_note: z.string(),
    literacy_flag: z.string(),
    risk_family: z.enum(['CORROSIVE', 'IRRITANT', 'SENSITIZER']).nullable(),
    status: z.enum(['safe', 'warning', 'avoid', 'unknown']),
    is_ai_generated: z.boolean(),
  })
  .strict();

export const AnalyzeResponseSchema = z.object({
  contractVersion: z.literal(CONTRACT_VERSION),
  ingredients: z.array(AnalyzedIngredientSchema),
  meta: z.object({
    model: z.string(),
    promptVersion: z.string(),
    attempts: z.number().int().nonnegative(),
    degraded: z.boolean(),
    latencyMs: z.number().nonnegative(),
  }),
});

export const ErrorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type AnalyzedIngredientDto = z.infer<typeof AnalyzedIngredientSchema>;

// Compile-time guard: the wire schema and the app's Ingredient type must not drift apart.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const contractMatchesIngredient: Exact<
  AnalyzedIngredientDto,
  Omit<Ingredient, 'allergen_info'>
> = true;
void contractMatchesIngredient;
