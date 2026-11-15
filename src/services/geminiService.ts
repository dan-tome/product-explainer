import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import { Ingredient, IngredientStatus, ProductType, RiskFamily } from '../types/product';

// One-shot anchor provided by Science Lead — establishes the Hybrid Guardrail structure.
const ONE_SHOT_EXAMPLE = `
Example (Sodium Hydroxide in a cosmetic/food context):
{
  "scientific_name": "Sodium Hydroxide",
  "common_name": "Lye",
  "functional_purpose": "Stabilises formula pH for safety and efficacy - pH Regulator",
  "regulatory_context": "Approved by FDA (21 CFR 184.1763) and EFSA as a processing aid. Strict concentration limits apply.",
  "exposure_context": "Safe as used in neutralised products. Avoid contact with concentrated solution.",
  "science_note": "A strong alkali that fully dissociates in water; at label concentrations it is neutralised and presents no corrosive hazard in the finished product.",
  "literacy_flag": "The same compound used to cure olives and give pretzels their chewy crust — it is neutralised during processing, leaving no caustic residue.",
  "risk_family": "CORROSIVE",
  "status": "warning"
}
`.trim();

const CONTEXT_BY_TYPE: Record<ProductType, string> = {
  FOOD: 'For food ingredients, frame functional_purpose and science_note around taste, nutrition, texture, or shelf-life benefit.',
  COSMETIC:
    'For cosmetic ingredients, frame functional_purpose and science_note around skin feel, appearance, or hair benefit.',
  HOUSEHOLD:
    'For household ingredients, frame functional_purpose and science_note around cleaning performance or user safety.',
  UNKNOWN: 'Frame functional_purpose and science_note in plain, benefit-first language.',
};

const buildPrompt = (productType: ProductType): string =>
  `
You are a product ingredient analyst. You will receive OCR-extracted tokens from a ${productType.toLowerCase()} product label — they may contain OCR errors.

${ONE_SHOT_EXAMPLE}

For each token:
1. If clearly not an ingredient (garbled text, brand names, marketing copy), omit it entirely.
2. Correct any OCR errors.
3. Return a JSON object with these exact fields:
   - "source_token": the input token this entry explains, copied exactly as given (before any OCR correction)
   - "scientific_name": INCI or chemical name as it appears on the label
   - "common_name": everyday human-readable name (e.g. "Vitamin C", not "Ascorbic Acid")
   - "functional_purpose": Format strictly as "[Benefit] - [Scientific Action]" (e.g. "Prevents spoilage - Preservative")
   - "regulatory_context": one sentence on the 2026 EFSA/FDA/ECHA regulatory status
   - "exposure_context": If risk_family is CORROSIVE, IRRITANT, or SENSITIZER, provide a specific usage guardrail (e.g. "Avoid eye contact", "Rinse well after use"). For Corrosives in neutralised/formulated products use neutral phrasing: "Safe as used in neutralised products." For non-risk ingredients: "Safe for intended use."
   - "science_note": one sentence on the ingredient's chemistry or biological mechanism in accessible language
   - "literacy_flag": a short educational "did you know" takeaway that builds the user's chemical literacy. For the following Agency-Priority ingredients, the literacy_flag MUST lead with an empowering, action-oriented insight rather than alarm — help the user understand what it is, why regulators watch it, and how to spot it on a label:
     • Propylparaben / Butylparaben — preservative, paraben family, check for "-paraben" suffix on labels
     • Benzophenone-3 / Oxybenzone — UV filter, check sunscreen INCI lists
     • Bisphenol A (BPA) — found in some packaging, not a direct ingredient but may be listed as "BPA-free" on label context
     • Triclosan — antibacterial, now banned in many wash-off products; if present, worth noting
   - "risk_family": one of "CORROSIVE", "IRRITANT", "SENSITIZER", or null
   - "status": one of "safe", "warning", "avoid", or "unknown"

${CONTEXT_BY_TYPE[productType]}

Respond with a JSON array only. No markdown, no code fences.

Tokens:
`.trim();

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

export const analyzeWithGemini = async (
  ingredients: string[],
  productType: ProductType = 'FOOD',
): Promise<Omit<Ingredient, 'allergen_info'>[]> => {
  if (ingredients.length === 0) return [];

  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel(
    {
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: INGREDIENT_RESPONSE_SCHEMA,
      },
    },
    { timeout: GEMINI_TIMEOUT_MS },
  );
  const prompt = buildPrompt(productType) + '\n' + ingredients.join('\n');

  let lastError: unknown;
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return joinByToken(ingredients, parseGeminiResponse(result.response.text()));
    } catch (error) {
      lastError = error;
    }
  }

  console.warn('[gemini] analysis failed after retry; showing unexplained ingredients', lastError);
  return ingredients.map(token => toIngredient({}, token));
};
