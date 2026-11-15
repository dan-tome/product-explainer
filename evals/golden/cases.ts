import type { ProductType, RiskFamily, IngredientStatus } from '../../src/types/product';

/**
 * Golden label set: the single source of truth for both eval tiers.
 *
 * Label text is written to look like real OCR output: line breaks, marketing copy, percentages,
 * nested parentheses, French/Latin INCI, and the odd misread character. Every expectation is
 * deliberately conservative: only assert what a careful human label-reader would insist on.
 */
export interface GoldenIngredient {
  /** Text that must appear inside one of the tokens sent to Gemini (normalised, lowercase). */
  token: string;
  /** Live tier: acceptable plain-English names (any match, case-insensitive substring). */
  commonNameAnyOf?: string[];
  /** Live tier: the risk family a careful reviewer expects (omit when not asserted). */
  riskFamily?: RiskFamily;
  /** Live tier safety floor: statuses that would be wrong for this ingredient. */
  statusNot?: IngredientStatus[];
}

export interface GoldenCase {
  id: string;
  description: string;
  labelText: string;
  /** Product type a person would assign from the label alone. */
  productType: ProductType;
  ingredients: GoldenIngredient[];
  /** Text that must never appear in any token (marketing, weights, warnings). */
  notIngredients?: string[];
  /** Allergen families declared on the label that must survive into the tokens. */
  allergens?: ('Milk' | 'Egg' | 'Wheat')[];
  /** Endocrine-disrupting chemicals that must be detectable from the tokens. */
  edcs?: string[];
}

export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'food-crisps',
    description: 'Simple food label with a parenthetical oil blend',
    labelText:
      'Caramelised Onion Crisps\nINGREDIENTS: Potatoes, Vegetable Oils (Sunflower, Rapeseed), Salt, Potassium Chloride, Paprika Powder, Sugar, Onion Powder.\n\nNutrition: per 100g Energy 2100kJ',
    productType: 'FOOD',
    ingredients: [
      { token: 'potatoes', commonNameAnyOf: ['potato'] },
      { token: 'vegetable oils', commonNameAnyOf: ['oil'] },
      { token: 'salt', commonNameAnyOf: ['salt'] },
      { token: 'potassium chloride', commonNameAnyOf: ['salt substitute', 'potassium'] },
      { token: 'paprika powder', commonNameAnyOf: ['paprika'] },
      { token: 'sugar', commonNameAnyOf: ['sugar'] },
      { token: 'onion powder', commonNameAnyOf: ['onion'] },
    ],
    notIngredients: ['2100kj', 'caramelised onion crisps'],
  },
  {
    id: 'food-biscuit-allergens',
    description: 'Allergens declared inside parentheses and as a short word',
    labelText:
      'Ingredients: Wheat Flour (Wheat Flour, Calcium Carbonate, Iron, Niacin, Thiamin), Sugar, Palm Oil, Whey Powder (Milk), Glucose Syrup, Raising Agents (Sodium Bicarbonate, Ammonium Bicarbonate), Salt, Egg.\nContains: Wheat, Milk, Egg.',
    productType: 'FOOD',
    ingredients: [
      { token: 'wheat flour', commonNameAnyOf: ['wheat', 'flour'] },
      { token: 'sugar', commonNameAnyOf: ['sugar'] },
      { token: 'palm oil', commonNameAnyOf: ['palm'] },
      { token: 'whey', commonNameAnyOf: ['whey', 'milk'] },
      { token: 'glucose syrup', commonNameAnyOf: ['glucose', 'syrup', 'sugar'] },
      { token: 'salt', commonNameAnyOf: ['salt'] },
      { token: 'egg', commonNameAnyOf: ['egg'] },
    ],
    allergens: ['Wheat', 'Milk', 'Egg'],
  },
  {
    id: 'food-noodles-hidden-allergens',
    description: 'Allergens appear only inside compound-ingredient parentheses',
    labelText:
      'INGREDIENTS: Noodles (Wheat Flour, Egg, Salt), Soy Sauce (Water, Soybeans, Wheat, Salt), Sesame Oil, Spring Onion.',
    productType: 'FOOD',
    ingredients: [
      { token: 'noodles', commonNameAnyOf: ['noodle'] },
      { token: 'soy sauce', commonNameAnyOf: ['soy'] },
      { token: 'sesame oil', commonNameAnyOf: ['sesame'] },
      { token: 'spring onion', commonNameAnyOf: ['onion', 'scallion'] },
    ],
    allergens: ['Wheat', 'Egg'],
  },
  {
    id: 'food-chocolate-ocr-noise',
    description: 'OCR misreads the capital I in "Ingredients" as a lowercase l',
    labelText:
      'MILK CHOCOLATE\nlngredients: Sugar, Cocoa Butter, Whole Milk Powder, Cocoa Mass, Emulsifier (Soya Lecithin), Vanilla Extract.\nMilk chocolate contains cocoa solids 30% minimum.',
    productType: 'FOOD',
    ingredients: [
      { token: 'sugar', commonNameAnyOf: ['sugar'] },
      { token: 'cocoa butter', commonNameAnyOf: ['cocoa'] },
      { token: 'whole milk powder', commonNameAnyOf: ['milk'] },
      { token: 'cocoa mass', commonNameAnyOf: ['cocoa', 'chocolate'] },
      { token: 'vanilla extract', commonNameAnyOf: ['vanilla'] },
    ],
    allergens: ['Milk'],
    notIngredients: ['30% minimum'],
  },
  {
    id: 'food-granola-marketing',
    description: 'Marketing copy and pack info on the same line as the ingredients',
    labelText:
      'NEW! Crunchy & 100% natural. INGREDIENTS: Oat Flakes, Honey, Sunflower Seeds, Dried Apple. Net wt 500g. Best before: see top of pack.',
    productType: 'FOOD',
    ingredients: [
      { token: 'oat flakes', commonNameAnyOf: ['oat'] },
      { token: 'honey', commonNameAnyOf: ['honey'] },
      { token: 'sunflower seeds', commonNameAnyOf: ['sunflower'] },
      { token: 'dried apple', commonNameAnyOf: ['apple'] },
    ],
    notIngredients: ['net wt', 'best before', '100% natural'],
  },
  {
    id: 'food-supplement',
    description: 'Supplement capsule with functional-role prefixes',
    labelText:
      'Magnesium 375mg - Food Supplement\nIngredients: Magnesium Citrate, Bulking Agent (Microcrystalline Cellulose), Capsule Shell (Hydroxypropyl Methylcellulose), Anti-caking Agent (Magnesium Stearate).',
    productType: 'FOOD',
    ingredients: [
      { token: 'magnesium citrate', commonNameAnyOf: ['magnesium'] },
      { token: 'bulking agent', commonNameAnyOf: ['cellulose', 'bulking', 'filler'] },
      { token: 'capsule shell', commonNameAnyOf: ['capsule', 'cellulose'] },
      { token: 'anti-caking agent', commonNameAnyOf: ['stearate', 'anti-caking'] },
    ],
  },
  {
    id: 'cosmetic-moisturiser-parabens',
    description: 'INCI moisturiser with two parabens and Latin names',
    labelText:
      'Daily Hydrating Cream. Apply to clean skin morning and night.\nINGREDIENTS: Aqua, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Dimethicone, Phenoxyethanol, Methylparaben, Propylparaben, Tocopherol, Parfum.',
    productType: 'COSMETIC',
    ingredients: [
      { token: 'aqua', commonNameAnyOf: ['water'] },
      { token: 'glycerin', commonNameAnyOf: ['glycerin', 'glycerol'] },
      { token: 'cetearyl alcohol', commonNameAnyOf: ['fatty alcohol', 'cetearyl', 'emulsifier'] },
      { token: 'dimethicone', commonNameAnyOf: ['silicone', 'dimethicone'] },
      { token: 'phenoxyethanol', commonNameAnyOf: ['preservative', 'phenoxyethanol'] },
      { token: 'methylparaben', commonNameAnyOf: ['paraben'] },
      { token: 'propylparaben', commonNameAnyOf: ['paraben'] },
      { token: 'tocopherol', commonNameAnyOf: ['vitamin e'] },
      { token: 'fragrance', commonNameAnyOf: ['fragrance', 'perfume', 'scent'] },
    ],
    edcs: ['methylparaben', 'propylparaben'],
    notIngredients: ['apply to clean skin'],
  },
  {
    id: 'cosmetic-sunscreen-actives',
    description: 'Active ingredients with percentages',
    labelText:
      'SPF 30 Sun Lotion. Apply generously to skin before sun exposure.\nActive ingredients: Oxybenzone 6%, Avobenzone 3%, Octinoxate 7.5%\n\nInactive: Water, Glycerin, Carbomer.',
    productType: 'COSMETIC',
    ingredients: [
      {
        token: 'oxybenzone',
        commonNameAnyOf: ['uv filter', 'sunscreen', 'oxybenzone', 'benzophenone'],
      },
      { token: 'avobenzone', commonNameAnyOf: ['uv filter', 'sunscreen', 'avobenzone'] },
      {
        token: 'octinoxate',
        commonNameAnyOf: ['uv filter', 'sunscreen', 'octinoxate', 'cinnamate'],
      },
    ],
    edcs: ['oxybenzone'],
  },
  {
    id: 'cosmetic-shampoo-sensitisers',
    description: 'Rinse-off shampoo with a known contact sensitiser',
    labelText:
      'Lather into wet hair, rinse thoroughly.\nIngredients: Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Sodium Chloride, Methylisothiazolinone, Citric Acid, Parfum, Limonene, Linalool.',
    productType: 'COSMETIC',
    ingredients: [
      { token: 'aqua', commonNameAnyOf: ['water'] },
      {
        token: 'sodium laureth sulfate',
        commonNameAnyOf: ['sles', 'surfactant', 'cleanser', 'sulfate'],
      },
      { token: 'cocamidopropyl betaine', commonNameAnyOf: ['surfactant', 'coconut', 'betaine'] },
      { token: 'sodium chloride', commonNameAnyOf: ['salt'] },
      {
        token: 'methylisothiazolinone',
        commonNameAnyOf: ['preservative', 'mit', 'methylisothiazolinone'],
        riskFamily: 'SENSITIZER',
        statusNot: ['safe'],
      },
      { token: 'citric acid', commonNameAnyOf: ['citric'] },
      {
        token: 'limonene',
        commonNameAnyOf: ['citrus', 'limonene', 'fragrance'],
        riskFamily: 'SENSITIZER',
      },
      {
        token: 'linalool',
        commonNameAnyOf: ['linalool', 'fragrance', 'floral'],
        riskFamily: 'SENSITIZER',
      },
    ],
  },
  {
    id: 'cosmetic-french-inci',
    description: 'French INCI terms that must be normalised to English before tokenising',
    labelText:
      "INGRÉDIENTS: Eau, Glycérine, Huile d'amande douce, Parfum, Tocophérol. Rincer abondamment.",
    productType: 'COSMETIC',
    ingredients: [
      { token: 'water', commonNameAnyOf: ['water'] },
      { token: 'glyc', commonNameAnyOf: ['glycerin', 'glycerol'] },
      { token: "oil d'amande douce", commonNameAnyOf: ['almond'] },
      { token: 'fragrance', commonNameAnyOf: ['fragrance', 'perfume'] },
      { token: 'toco', commonNameAnyOf: ['vitamin e'] },
    ],
    notIngredients: ['rincer'],
  },
  {
    id: 'household-drain-unblocker',
    description: 'Corrosive household product with a hazard statement',
    labelText:
      'Drain Unblocker Gel. Powerful cleaning action.\nIngredients: Sodium Hydroxide 30%, Water.\n\nDANGER: Causes severe skin burns and eye damage. Keep out of reach of children.',
    productType: 'HOUSEHOLD',
    ingredients: [
      {
        token: 'sodium hydroxide',
        commonNameAnyOf: ['lye', 'caustic soda'],
        riskFamily: 'CORROSIVE',
        statusNot: ['safe'],
      },
      { token: 'water', commonNameAnyOf: ['water'] },
    ],
    notIngredients: ['danger', 'severe skin burns', 'reach of children'],
  },
  {
    id: 'household-laundry-detergent',
    description: 'EU detergent declaration with percentage bands before the ingredient list',
    labelText:
      'Bio Laundry Detergent. Contains 5-15% anionic surfactants, <5% non-ionic surfactants, enzymes, perfume.\n\nIngredients: Aqua, Sodium Dodecylbenzenesulfonate, Laureth-7, Subtilisin, Benzisothiazolinone, Parfum.',
    productType: 'HOUSEHOLD',
    ingredients: [
      { token: 'aqua', commonNameAnyOf: ['water'] },
      { token: 'sodium dodecylbenzenesulfonate', commonNameAnyOf: ['surfactant', 'detergent'] },
      { token: 'laureth-7', commonNameAnyOf: ['surfactant'] },
      { token: 'subtilisin', commonNameAnyOf: ['enzyme', 'protease'] },
      {
        token: 'benzisothiazolinone',
        commonNameAnyOf: ['preservative', 'bit', 'benzisothiazolinone'],
        riskFamily: 'SENSITIZER',
      },
      { token: 'fragrance', commonNameAnyOf: ['fragrance', 'perfume'] },
    ],
    notIngredients: ['5-15%'],
  },
];
