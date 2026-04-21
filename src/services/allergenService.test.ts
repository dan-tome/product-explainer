import { checkAllergen, detectAllergens } from './allergenService';

describe('checkAllergen', () => {
  it('returns null for a non-allergen ingredient', () => {
    expect(checkAllergen('water')).toBeNull();
    expect(checkAllergen('ascorbic acid')).toBeNull();
  });

  it('detects direct milk alias', () => {
    const result = checkAllergen('caseinate');
    expect(result?.allergen).toBe('Milk');
  });

  it('detects sodium caseinate as milk', () => {
    const result = checkAllergen('sodium caseinate');
    expect(result?.allergen).toBe('Milk');
  });

  it('detects egg aliases', () => {
    expect(checkAllergen('albumin')?.allergen).toBe('Egg');
    expect(checkAllergen('ovalbumin')?.allergen).toBe('Egg');
  });

  it('detects wheat aliases', () => {
    expect(checkAllergen('gluten')?.allergen).toBe('Wheat');
    expect(checkAllergen('semolina')?.allergen).toBe('Wheat');
  });

  it('is case-insensitive', () => {
    expect(checkAllergen('Whey Protein')?.allergen).toBe('Milk');
    expect(checkAllergen('GLUTEN')?.allergen).toBe('Wheat');
  });

  it('includes an identityNote on match', () => {
    const result = checkAllergen('lactose');
    expect(result?.identityNote).toContain('milk');
  });
});

describe('detectAllergens', () => {
  it('returns empty array when no allergens present', () => {
    expect(detectAllergens(['water', 'salt', 'citric acid'])).toHaveLength(0);
  });

  it('returns all matched allergens from a list', () => {
    const results = detectAllergens(['water', 'caseinate', 'gluten', 'sugar']);
    expect(results).toHaveLength(2);
    expect(results.map(r => r.allergen)).toEqual(expect.arrayContaining(['Milk', 'Wheat']));
  });
});

describe('Performance Audit — O(1) allergen engine', () => {
  // Realistic 50-item INCI list mixing known allergens and non-allergens
  const INCI_50 = [
    'aqua', 'glycerin', 'sodium laureth sulfate', 'cocamidopropyl betaine',
    'sodium chloride', 'caseinate', 'citric acid', 'phenoxyethanol',
    'parfum', 'gluten', 'polysorbate 80', 'xanthan gum',
    'tocopherol', 'retinol', 'niacinamide', 'hyaluronic acid',
    'albumin', 'salicylic acid', 'lactic acid', 'zinc oxide',
    'titanium dioxide', 'iron oxides', 'mica', 'talc',
    'dimethicone', 'cyclomethicone', 'butylene glycol', 'propylene glycol',
    'carbomer', 'triethanolamine', 'disodium edta', 'sodium benzoate',
    'potassium sorbate', 'methylparaben', 'ethylparaben', 'benzyl alcohol',
    'whey protein', 'magnesium stearate', 'silicon dioxide', 'maltodextrin',
    'sunflower oil', 'shea butter', 'coconut oil', 'jojoba oil',
    'aloe vera', 'green tea extract', 'vitamin e', 'coenzyme q10',
    'ceramide', 'cholesterol',
  ];

  it('processes a 50-item INCI list in under 200ms (O(1) Map lookup per item)', () => {
    const start = performance.now();
    detectAllergens(INCI_50);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it('correctly identifies allergens within the 50-item list', () => {
    const matches = detectAllergens(INCI_50);
    const allergens = matches.map(m => m.allergen);
    expect(allergens).toContain('Milk');  // caseinate, whey protein
    expect(allergens).toContain('Wheat'); // gluten
    expect(allergens).toContain('Egg');   // albumin
  });
});
