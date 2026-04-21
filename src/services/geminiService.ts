import { GoogleGenerativeAI } from '@google/generative-ai';
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
  COSMETIC: 'For cosmetic ingredients, frame functional_purpose and science_note around skin feel, appearance, or hair benefit.',
  HOUSEHOLD: 'For household ingredients, frame functional_purpose and science_note around cleaning performance or user safety.',
  UNKNOWN: 'Frame functional_purpose and science_note in plain, benefit-first language.',
};

const buildPrompt = (productType: ProductType): string => `
You are a product ingredient analyst. You will receive OCR-extracted tokens from a ${productType.toLowerCase()} product label — they may contain OCR errors.

${ONE_SHOT_EXAMPLE}

For each token:
1. If clearly not an ingredient (garbled text, brand names, marketing copy), omit it entirely.
2. Correct any OCR errors.
3. Return a JSON object with these exact fields:
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

export const analyzeWithGemini = async (
  ingredients: string[],
  productType: ProductType = 'FOOD',
): Promise<Omit<Ingredient, 'allergen_info'>[]> => {
  if (ingredients.length === 0) return [];

  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    const result = await model.generateContent(buildPrompt(productType) + '\n' + ingredients.join('\n'));
    const parsed: GeminiRaw[] = JSON.parse(result.response.text());
    return parsed.map((raw, i) => toIngredient(raw, ingredients[i] ?? ''));
  } catch {
    return ingredients.map(token => toIngredient({}, token));
  }
};
