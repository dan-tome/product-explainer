export type ProductType = 'FOOD' | 'COSMETIC' | 'HOUSEHOLD' | 'UNKNOWN';

export type IngredientStatus = 'safe' | 'warning' | 'avoid' | 'unknown';

export type RiskFamily = 'CORROSIVE' | 'IRRITANT' | 'SENSITIZER' | null;

export interface AllergenInfo {
  is_match: boolean;
  alias_detected: string | null;
}

export interface Ingredient {
  scientific_name: string;
  common_name: string;
  functional_purpose: string;  // [Benefit] - [Scientific Action]
  regulatory_context: string;
  exposure_context: string;    // usage guardrail; required for CORROSIVE/IRRITANT/SENSITIZER
  science_note: string;        // one-sentence mechanism / chemistry explanation
  literacy_flag: string;       // educational "did you know" takeaway
  risk_family: RiskFamily;
  status: IngredientStatus;
  is_ai_generated: boolean;
  allergen_info: AllergenInfo;
}

export interface AllergenMatch {
  ingredient: string;
  allergen: string;
  identityNote: string;
}
