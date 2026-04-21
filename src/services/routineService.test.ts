jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('./edcService', () => ({
  checkEDC: jest.fn(() => null),
  isRespiratoryHazard: jest.fn(() => false),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkEDC } from './edcService';
import {
  addScan, removeScan, getCompoundExposures,
  getScannedProducts, getRoutineSummary, clearRoutine, loadRoutine,
} from './routineService';
import { Ingredient } from '../types/product';

const mockCheckEDC = checkEDC as jest.Mock;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeIngredient = (
  scientific_name: string,
  overrides: Partial<Ingredient> = {},
): Ingredient => ({
  scientific_name,
  common_name: scientific_name,
  functional_purpose: 'Test purpose - Function',
  regulatory_context: 'Approved.',
  exposure_context: 'Safe for intended use.',
  science_note: 'No note.',
  literacy_flag: '',
  risk_family: null,
  status: 'safe',
  is_ai_generated: true,
  allergen_info: { is_match: false, alias_detected: null },
  ...overrides,
});

const makeAllergenIngredient = (scientific_name: string, allergen: string): Ingredient =>
  makeIngredient(scientific_name, {
    allergen_info: { is_match: true, alias_detected: allergen },
  });

const CLEANSER_INGREDIENTS = [
  makeIngredient('Aqua'),
  makeIngredient('Methylparaben'), // will be EDC-flagged in tests
  makeIngredient('Glycerin'),
];

const LOTION_INGREDIENTS = [
  makeIngredient('Aqua'),
  makeIngredient('Methylparaben'), // same EDC
  makeIngredient('Shea Butter'),
];

const SUNSCREEN_INGREDIENTS = [
  makeIngredient('Aqua'),
  makeIngredient('Oxybenzone'), // different EDC
  makeIngredient('Dimethicone'),
];

// ── Test lifecycle ────────────────────────────────────────────────────────────

beforeEach(async () => {
  clearRoutine(); // also resets _hydrated flag
  await AsyncStorage.clear();
  mockCheckEDC.mockReturnValue(null); // default: no EDC match
});

// ── addScan & getScannedProducts ──────────────────────────────────────────────

describe('addScan', () => {
  it('adds a product to the routine', () => {
    addScan('p1', 'Cleanser', CLEANSER_INGREDIENTS);
    expect(getScannedProducts()).toHaveLength(1);
    expect(getScannedProducts()[0].label).toBe('Cleanser');
  });

  it('re-adding the same id overwrites without duplicating', () => {
    addScan('p1', 'Cleanser', CLEANSER_INGREDIENTS);
    addScan('p1', 'Cleanser v2', CLEANSER_INGREDIENTS);
    expect(getScannedProducts()).toHaveLength(1);
    expect(getScannedProducts()[0].label).toBe('Cleanser v2');
  });

  it('returns products sorted oldest-first', () => {
    addScan('p1', 'First', []);
    addScan('p2', 'Second', []);
    const products = getScannedProducts();
    expect(products[0].label).toBe('First');
    expect(products[1].label).toBe('Second');
  });
});

// ── removeScan ────────────────────────────────────────────────────────────────

describe('removeScan', () => {
  it('removes a product from the routine', () => {
    addScan('p1', 'Cleanser', []);
    removeScan('p1');
    expect(getScannedProducts()).toHaveLength(0);
  });

  it('is a no-op for an id that was never added', () => {
    expect(() => removeScan('ghost')).not.toThrow();
  });

  it('removes the product from compound exposure tracking', () => {
    mockCheckEDC.mockImplementation((name: string) =>
      name === 'Methylparaben'
        ? { ingredient: name, family: 'Paraben', concern: 'EDC concern', regulation: 'Restricted.' }
        : null,
    );
    addScan('p1', 'Cleanser', [makeIngredient('Methylparaben')]);
    addScan('p2', 'Lotion', [makeIngredient('Methylparaben')]);
    expect(getCompoundExposures()).toHaveLength(1);

    removeScan('p2');
    expect(getCompoundExposures()).toHaveLength(0); // drops below minOccurrences of 2
  });
});

// ── getCompoundExposures ──────────────────────────────────────────────────────

describe('getCompoundExposures — EDC tracking', () => {
  beforeEach(() => {
    mockCheckEDC.mockImplementation((name: string) =>
      name === 'Methylparaben'
        ? { ingredient: name, family: 'Paraben', concern: 'EDC concern', regulation: 'EU restricted.' }
        : null,
    );
  });

  it('returns empty array when only one product scanned', () => {
    addScan('p1', 'Cleanser', CLEANSER_INGREDIENTS);
    expect(getCompoundExposures()).toHaveLength(0);
  });

  it('detects a compound EDC exposure across two products', () => {
    addScan('p1', 'Cleanser', CLEANSER_INGREDIENTS);
    addScan('p2', 'Lotion', LOTION_INGREDIENTS);
    const exposures = getCompoundExposures();
    expect(exposures).toHaveLength(1);
    expect(exposures[0].family).toBe('EDC');
    expect(exposures[0].occurrences).toBe(2);
    expect(exposures[0].products).toContain('Cleanser');
    expect(exposures[0].products).toContain('Lotion');
  });

  it('does not flag an ingredient that appears in only one product', () => {
    addScan('p1', 'Cleanser', CLEANSER_INGREDIENTS);
    addScan('p2', 'Sunscreen', SUNSCREEN_INGREDIENTS); // no Methylparaben
    expect(getCompoundExposures()).toHaveLength(0);
  });

  it('respects a custom minOccurrences threshold', () => {
    addScan('p1', 'A', [makeIngredient('Methylparaben')]);
    addScan('p2', 'B', [makeIngredient('Methylparaben')]);
    addScan('p3', 'C', [makeIngredient('Methylparaben')]);
    expect(getCompoundExposures(3)).toHaveLength(1);
    expect(getCompoundExposures(4)).toHaveLength(0);
  });

  it('sorts compound exposures by occurrences descending', () => {
    mockCheckEDC.mockImplementation((name: string) => {
      if (name === 'Methylparaben') return { ingredient: name, family: 'Paraben', concern: 'EDC', regulation: '' };
      if (name === 'Triclosan') return { ingredient: name, family: 'Antimicrobial', concern: 'EDC', regulation: '' };
      return null;
    });
    // Methylparaben in 3 products, Triclosan in 2
    addScan('p1', 'A', [makeIngredient('Methylparaben'), makeIngredient('Triclosan')]);
    addScan('p2', 'B', [makeIngredient('Methylparaben'), makeIngredient('Triclosan')]);
    addScan('p3', 'C', [makeIngredient('Methylparaben')]);
    const [first, second] = getCompoundExposures();
    expect(first.occurrences).toBeGreaterThanOrEqual(second.occurrences);
  });
});

describe('getCompoundExposures — Allergen tracking', () => {
  it('detects a compound allergen exposure across two products', () => {
    addScan('p1', 'Cleanser', [makeAllergenIngredient('Caseinate', 'Milk')]);
    addScan('p2', 'Lotion', [makeAllergenIngredient('Caseinate', 'Milk')]);
    const exposures = getCompoundExposures();
    expect(exposures).toHaveLength(1);
    expect(exposures[0].family).toBe('Allergen');
    expect(exposures[0].concern).toContain('Milk');
  });

  it('EDC takes precedence over allergen for the same ingredient', () => {
    mockCheckEDC.mockImplementation((name: string) =>
      name === 'Caseinate'
        ? { ingredient: name, family: 'TestFamily', concern: 'EDC concern', regulation: '' }
        : null,
    );
    addScan('p1', 'A', [makeAllergenIngredient('Caseinate', 'Milk')]);
    addScan('p2', 'B', [makeAllergenIngredient('Caseinate', 'Milk')]);
    const [exposure] = getCompoundExposures();
    expect(exposure.family).toBe('EDC');
  });
});

// ── getRoutineSummary ─────────────────────────────────────────────────────────

describe('getRoutineSummary', () => {
  it('returns zero counts for an empty routine', () => {
    const summary = getRoutineSummary();
    expect(summary.totalProducts).toBe(0);
    expect(summary.edcCount).toBe(0);
    expect(summary.allergenCount).toBe(0);
    expect(summary.compoundExposures).toHaveLength(0);
  });

  it('counts EDC and allergen compound exposures separately', () => {
    mockCheckEDC.mockImplementation((name: string) =>
      name === 'Methylparaben'
        ? { ingredient: name, family: 'Paraben', concern: 'EDC', regulation: '' }
        : null,
    );
    addScan('p1', 'A', [
      makeIngredient('Methylparaben'),
      makeAllergenIngredient('Caseinate', 'Milk'),
    ]);
    addScan('p2', 'B', [
      makeIngredient('Methylparaben'),
      makeAllergenIngredient('Caseinate', 'Milk'),
    ]);
    const summary = getRoutineSummary();
    expect(summary.edcCount).toBe(1);
    expect(summary.allergenCount).toBe(1);
    expect(summary.totalProducts).toBe(2);
  });
});

// ── clearRoutine ──────────────────────────────────────────────────────────────

describe('clearRoutine', () => {
  it('empties all products and resets compound exposure tracking', () => {
    mockCheckEDC.mockReturnValue({ ingredient: 'X', family: 'F', concern: 'C', regulation: '' });
    addScan('p1', 'A', [makeIngredient('X')]);
    addScan('p2', 'B', [makeIngredient('X')]);
    clearRoutine();
    expect(getScannedProducts()).toHaveLength(0);
    expect(getCompoundExposures()).toHaveLength(0);
  });
});

// ── loadRoutine ───────────────────────────────────────────────────────────────

describe('loadRoutine', () => {
  it('returns without error when storage is empty', async () => {
    await expect(loadRoutine()).resolves.toBeUndefined();
    expect(getScannedProducts()).toHaveLength(0);
  });

  it('hydrates products from storage written by a previous session', async () => {
    // Seed AsyncStorage directly (simulating data persisted by a prior app session)
    const stored: [string, ScannedProduct][] = [
      ['p1', { id: 'p1', label: 'Cleanser', ingredients: CLEANSER_INGREDIENTS, scannedAt: Date.now() }],
    ];
    await AsyncStorage.setItem('@healthscan/routine-v1', JSON.stringify(stored));

    await loadRoutine();
    expect(getScannedProducts()).toHaveLength(1);
    expect(getScannedProducts()[0].label).toBe('Cleanser');
  });
});

// ── Performance Audit ─────────────────────────────────────────────────────────

describe('Performance Audit — Heartbeat budget (200ms)', () => {
  const makeIngredientList = (size: number): Ingredient[] =>
    Array.from({ length: size }, (_, i) => {
      // Mix in known allergens and EDC suspects realistically
      if (i % 10 === 0) return makeAllergenIngredient(`Caseinate-${i}`, 'Milk');
      return makeIngredient(`Ingredient-${i}`);
    });

  it('addScan + getCompoundExposures for 5 × 50-item scans stays under 200ms', () => {
    mockCheckEDC.mockImplementation((name: string) =>
      name.startsWith('Caseinate') // simulate EDC hits on every 10th ingredient
        ? { ingredient: name, family: 'Paraben', concern: 'EDC', regulation: '' }
        : null,
    );

    const start = performance.now();
    for (let scan = 0; scan < 5; scan++) {
      addScan(`product-${scan}`, `Product ${scan}`, makeIngredientList(50));
    }
    getCompoundExposures();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(200);
  });

  it('getCompoundExposures alone is sub-millisecond after 5 scans are loaded', () => {
    for (let scan = 0; scan < 5; scan++) {
      addScan(`product-${scan}`, `Product ${scan}`, makeIngredientList(50));
    }
    const start = performance.now();
    getCompoundExposures();
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1); // O(k) over the flagged index only
  });
});
