import { AllergenMatch } from '../types/product';

// Many-to-one alias map: alias (lowercase) → top-level allergen label
const ALLERGEN_ALIASES = new Map<string, string>([
  // Milk derivatives
  ['milk', 'Milk'],
  ['lactose', 'Milk'],
  ['lactulose', 'Milk'],
  ['casein', 'Milk'],
  ['caseinate', 'Milk'],
  ['sodium caseinate', 'Milk'],
  ['calcium caseinate', 'Milk'],
  ['whey', 'Milk'],
  ['whey protein', 'Milk'],
  ['lactalbumin', 'Milk'],
  ['lactoglobulin', 'Milk'],
  ['butter', 'Milk'],
  ['buttermilk', 'Milk'],
  ['cream', 'Milk'],
  ['ghee', 'Milk'],

  // Egg derivatives
  ['egg', 'Egg'],
  ['eggs', 'Egg'],
  ['albumin', 'Egg'],
  ['globulin', 'Egg'],
  ['lysozyme', 'Egg'],
  ['mayonnaise', 'Egg'],
  ['meringue', 'Egg'],
  ['ovalbumin', 'Egg'],
  ['ovomucin', 'Egg'],
  ['ovomucoid', 'Egg'],
  ['ovovitellin', 'Egg'],
  ['silici albuminate', 'Egg'],

  // Wheat / Gluten derivatives
  ['wheat', 'Wheat'],
  ['wheat flour', 'Wheat'],
  ['whole wheat', 'Wheat'],
  ['wheat starch', 'Wheat'],
  ['wheat germ', 'Wheat'],
  ['wheat bran', 'Wheat'],
  ['gluten', 'Wheat'],
  ['vital wheat gluten', 'Wheat'],
  ['semolina', 'Wheat'],
  ['spelt', 'Wheat'],
  ['kamut', 'Wheat'],
  ['triticale', 'Wheat'],
  ['durum', 'Wheat'],
  ['einkorn', 'Wheat'],
  ['farro', 'Wheat'],
  ['emmer', 'Wheat'],
]);

const IDENTITY_NOTES: Record<string, string> = {
  Milk: 'This ingredient is derived from cow\'s milk.',
  Egg: 'This ingredient is derived from eggs.',
  Wheat: 'This ingredient is derived from wheat and contains gluten.',
};

/**
 * Checks a single ingredient name against the allergen alias map.
 * Returns an AllergenMatch if a known allergen is detected, otherwise null.
 * O(1) lookup per ingredient.
 */
export const checkAllergen = (ingredient: string): AllergenMatch | null => {
  const key = ingredient.toLowerCase().trim();
  const allergen = ALLERGEN_ALIASES.get(key);
  if (!allergen) return null;

  return {
    ingredient,
    allergen,
    identityNote: IDENTITY_NOTES[allergen] ?? `This ingredient is a derivative of ${allergen}.`,
  };
};

/**
 * Checks a list of ingredients and returns all allergen matches found.
 */
export const detectAllergens = (ingredients: string[]): AllergenMatch[] =>
  ingredients.flatMap(i => {
    const match = checkAllergen(i);
    return match ? [match] : [];
  });
