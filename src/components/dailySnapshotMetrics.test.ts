import { buildSegments, headlineForTone, OUTLOOK_COPY } from './dailySnapshotMetrics';
import { Ingredient } from '../types/product';

const makeIngredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  scientific_name: 'Ascorbic Acid',
  common_name: 'Vitamin C',
  functional_purpose: 'Preservative',
  regulatory_context: 'Approved.',
  exposure_context: 'Safe for intended use.',
  science_note: 'Antioxidant.',
  literacy_flag: '',
  risk_family: null,
  status: 'safe',
  is_ai_generated: true,
  allergen_info: { is_match: false, alias_detected: null },
  ...overrides,
});

describe('buildSegments — empty list', () => {
  it('returns clear tone with no ingredients', () => {
    const { tone } = buildSegments([]);
    expect(tone).toBe('clear');
  });

  it('returns 5 segments with no ingredients', () => {
    const { segments } = buildSegments([]);
    expect(segments).toHaveLength(5);
  });

  it('returns default summaryLine with no ingredients', () => {
    const { summaryLine } = buildSegments([]);
    expect(summaryLine).toMatch(/scan your product/i);
  });
});

describe('buildSegments — tone thresholds', () => {
  it('returns "clear" tone when all ingredients are safe (weight 0)', () => {
    const ingredients = Array.from({ length: 5 }, () => makeIngredient({ status: 'safe' }));
    const { tone } = buildSegments(ingredients);
    expect(tone).toBe('clear');
  });

  it('returns "shifting" tone when all ingredients are avoid + allergen match (weight ~4.0)', () => {
    const ingredients = Array.from({ length: 5 }, () =>
      makeIngredient({ status: 'avoid', allergen_info: { is_match: true, alias_detected: 'Milk' } }),
    );
    const { tone } = buildSegments(ingredients);
    expect(tone).toBe('shifting');
  });

  it('returns "mixed" tone when all ingredients are warning (weight 1.4)', () => {
    const ingredients = Array.from({ length: 5 }, () => makeIngredient({ status: 'warning' }));
    const { tone } = buildSegments(ingredients);
    expect(tone).toBe('mixed');
  });
});

describe('buildSegments — summary lines', () => {
  it('reports easygoing when no allergens and no watch items', () => {
    const ingredients = [makeIngredient({ status: 'safe' }), makeIngredient({ status: 'safe' })];
    const { summaryLine } = buildSegments(ingredients);
    expect(summaryLine).toMatch(/easygoing/i);
    expect(summaryLine).toMatch(/2 ingredients/);
  });

  it('uses singular "ingredient" for a list of one', () => {
    const { summaryLine } = buildSegments([makeIngredient({ status: 'safe' })]);
    expect(summaryLine).toMatch(/1 ingredient /);
  });

  it('reports allergen notes when allergens present but no warning/avoid', () => {
    const ingredients = [
      makeIngredient({ allergen_info: { is_match: true, alias_detected: 'Milk' } }),
      makeIngredient({ status: 'safe' }),
    ];
    const { summaryLine } = buildSegments(ingredients);
    expect(summaryLine).toMatch(/allergen note/i);
  });

  it('uses singular allergen note for one allergen', () => {
    const ingredients = [
      makeIngredient({ allergen_info: { is_match: true, alias_detected: 'Milk' } }),
    ];
    const { summaryLine } = buildSegments(ingredients);
    expect(summaryLine).toMatch(/1 allergen note\b/);
  });

  it('uses plural allergen notes for multiple allergens', () => {
    const ingredients = [
      makeIngredient({ allergen_info: { is_match: true, alias_detected: 'Milk' } }),
      makeIngredient({ allergen_info: { is_match: true, alias_detected: 'Egg' } }),
    ];
    const { summaryLine } = buildSegments(ingredients);
    expect(summaryLine).toMatch(/2 allergen notes/);
  });

  it('reports "closer look" when warning/avoid items are present', () => {
    const ingredients = [
      makeIngredient({ status: 'warning' }),
      makeIngredient({ status: 'safe' }),
    ];
    const { summaryLine } = buildSegments(ingredients);
    expect(summaryLine).toMatch(/closer look/i);
  });
});

describe('buildSegments — segments', () => {
  it('always returns exactly 5 segments regardless of ingredient count', () => {
    expect(buildSegments([makeIngredient()]).segments).toHaveLength(5);
    expect(buildSegments(Array.from({ length: 20 }, () => makeIngredient())).segments).toHaveLength(5);
  });

  it('each segment has a color string and label string', () => {
    const { segments } = buildSegments([makeIngredient()]);
    segments.forEach(seg => {
      expect(typeof seg.color).toBe('string');
      expect(typeof seg.label).toBe('string');
    });
  });
});

describe('headlineForTone', () => {
  it('returns "Mostly clear" for clear', () => {
    expect(headlineForTone('clear')).toBe('Mostly clear');
  });

  it('returns "Partly sunny" for bright', () => {
    expect(headlineForTone('bright')).toBe('Partly sunny');
  });

  it('returns "Mixed skies" for mixed', () => {
    expect(headlineForTone('mixed')).toBe('Mixed skies');
  });

  it('returns "Shifting light" for shifting', () => {
    expect(headlineForTone('shifting')).toBe('Shifting light');
  });
});

describe('OUTLOOK_COPY', () => {
  it('has a copy entry for all four tones', () => {
    expect(OUTLOOK_COPY.clear).toBeTruthy();
    expect(OUTLOOK_COPY.bright).toBeTruthy();
    expect(OUTLOOK_COPY.mixed).toBeTruthy();
    expect(OUTLOOK_COPY.shifting).toBeTruthy();
  });
});
