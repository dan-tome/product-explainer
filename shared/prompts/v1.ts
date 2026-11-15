import type { ProductType } from '../../src/types/product';

/**
 * Prompt v1. Prompts are versioned: change a prompt by adding v2.ts, not by editing this file,
 * so eval results and cached responses can always be traced to the exact prompt that made them.
 */
export const PROMPT_VERSION = 'v1';

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

export const buildPrompt = (productType: ProductType): string =>
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
