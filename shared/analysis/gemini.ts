import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import type {
  Ingredient,
  IngredientStatus,
  ProductType,
  RiskFamily,
} from '../../src/types/product';
import { buildPrompt, PROMPT_VERSION } from '../prompts/v1';

/**
 * Gemini analysis core, shared by the app (direct dev mode) and the server.
 * Pure apart from the injected `generate` call, so it is fully unit-testable.
 */

export const GEMINI_MODEL = 'gemini-2.5-flash';

type GeminiRaw = {
  source_token?: string;
  scientific_name?: string;
  common_name?: string;
  functional_purpose?: string;
  regulatory_context?: string;
  exposure_context?: string;
  science_note?: string;
  literacy_flag?: string;
  risk_family?: unknown;
  status?: string;
};

const STRING_FIELDS = [
  'source_token',
  'scientific_name',
  'common_name',
  'functional_purpose',
  'regulatory_context',
  'exposure_context',
  'science_note',
  'literacy_flag',
] as const;

/** Gemini structured-output schema: constrains the model to an array of ingredient objects. */
export const INGREDIENT_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      ...Object.fromEntries(STRING_FIELDS.map(f => [f, { type: SchemaType.STRING }])),
      risk_family: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['CORROSIVE', 'IRRITANT', 'SENSITIZER'],
        nullable: true,
      },
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['safe', 'warning', 'avoid', 'unknown'],
      },
    },
    required: [...STRING_FIELDS, 'risk_family', 'status'],
  },
};

export const GEMINI_TIMEOUT_MS = 20_000;
export const GEMINI_MAX_ATTEMPTS = 2;

const toRiskFamily = (value: unknown): RiskFamily => {
  if (value === 'CORROSIVE' || value === 'IRRITANT' || value === 'SENSITIZER') return value;
  return null;
};

const toIngredient = (raw: GeminiRaw, token: string): Omit<Ingredient, 'allergen_info'> => ({
  scientific_name: raw.scientific_name || token,
  common_name: raw.common_name || raw.scientific_name || token,
  functional_purpose: raw.functional_purpose || 'Function not identified.',
  regulatory_context: raw.regulatory_context || 'Regulatory status not available.',
  exposure_context: raw.exposure_context || 'Safe for intended use.',
  science_note: raw.science_note || 'No additional science note available.',
  literacy_flag: raw.literacy_flag || '',
  risk_family: toRiskFamily(raw.risk_family),
  status: (['safe', 'warning', 'avoid', 'unknown'].includes(raw.status || '')
    ? raw.status
    : 'unknown') as IngredientStatus,
  is_ai_generated: true,
});

/** Runtime guard: keep only plain objects, and only string values for string fields. */
const sanitizeRaw = (value: unknown): GeminiRaw | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const raw: GeminiRaw = { risk_family: record.risk_family };
  for (const field of STRING_FIELDS) {
    const v = record[field];
    if (typeof v === 'string') raw[field] = v;
  }
  if (typeof record.status === 'string') raw.status = record.status;
  return raw;
};

/** Parses the model's text into raw entries; throws if it is not a JSON array. */
export const parseGeminiResponse = (text: string): GeminiRaw[] => {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Gemini response is not a JSON array');
  return parsed.map(sanitizeRaw).filter((r): r is GeminiRaw => r !== null);
};

const normalizeToken = (t: string) => t.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Joins model output back to the input tokens by the echoed `source_token`, never by array position:
 * the model is told to drop non-ingredients, so positions shift as soon as it drops anything.
 * - Entries whose source_token is not an input token are discarded (hallucination guard).
 * - Tokens the model dropped are omitted (it judged them not to be ingredients).
 * - Legacy responses with no source_token at all are joined by position only when the counts
 *   match exactly; otherwise they are kept without a token fallback.
 * Output follows input-token order.
 */
export const joinByToken = (
  tokens: string[],
  entries: GeminiRaw[],
): Omit<Ingredient, 'allergen_info'>[] => {
  const hasEchoes = entries.some(e => typeof e.source_token === 'string' && e.source_token !== '');
  if (!hasEchoes) {
    if (entries.length === tokens.length) return entries.map((e, i) => toIngredient(e, tokens[i]));
    return entries
      .filter(e => e.scientific_name || e.common_name)
      .map(e => toIngredient(e, e.scientific_name || e.common_name || ''));
  }

  const unclaimed = new Map<string, GeminiRaw[]>();
  for (const entry of entries) {
    if (!entry.source_token) continue;
    const key = normalizeToken(entry.source_token);
    unclaimed.set(key, [...(unclaimed.get(key) ?? []), entry]);
  }

  const results: Omit<Ingredient, 'allergen_info'>[] = [];
  for (const token of tokens) {
    const queue = unclaimed.get(normalizeToken(token));
    const entry = queue?.shift();
    if (entry) results.push(toIngredient(entry, token));
  }
  return results;
};

export type AnalyzedIngredient = Omit<Ingredient, 'allergen_info'>;

export interface AnalyzeOutcome {
  ingredients: AnalyzedIngredient[];
  /** True when every attempt failed and the ingredients are unexplained placeholders. */
  degraded: boolean;
  attempts: number;
  promptVersion: string;
  model: string;
}

/** Calls Gemini once with the full prompt and returns the raw response text. */
export type GenerateFn = (prompt: string) => Promise<string>;

export const createGeminiGenerate = (apiKey: string): GenerateFn => {
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel(
    {
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: INGREDIENT_RESPONSE_SCHEMA,
      },
    },
    { timeout: GEMINI_TIMEOUT_MS },
  );
  return async prompt => (await model.generateContent(prompt)).response.text();
};

/** The exact prompt sent for a token list. Shared with the eval recorder so recordings match production. */
export const buildAnalysisPrompt = (tokens: string[], productType: ProductType): string =>
  buildPrompt(productType) + '\n' + tokens.join('\n');

export const analyzeTokens = async (
  tokens: string[],
  productType: ProductType,
  generate: GenerateFn,
): Promise<AnalyzeOutcome> => {
  const base = { promptVersion: PROMPT_VERSION, model: GEMINI_MODEL };
  if (tokens.length === 0) return { ...base, ingredients: [], degraded: false, attempts: 0 };

  const prompt = buildAnalysisPrompt(tokens, productType);
  let lastError: unknown;
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    try {
      const text = await generate(prompt);
      return {
        ...base,
        ingredients: joinByToken(tokens, parseGeminiResponse(text)),
        degraded: false,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
    }
  }

  console.warn('[gemini] analysis failed after retry; showing unexplained ingredients', lastError);
  return {
    ...base,
    ingredients: unexplained(tokens),
    degraded: true,
    attempts: GEMINI_MAX_ATTEMPTS,
  };
};

/** Placeholder ingredients used when no explanation could be obtained. */
export const unexplained = (tokens: string[]): AnalyzedIngredient[] =>
  tokens.map(token => toIngredient({}, token));
