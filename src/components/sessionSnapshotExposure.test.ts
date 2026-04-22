import type { Ingredient } from '../types/product';
import type { EDCMatch } from '../services/edcService';
import { hasCompoundExposure } from './sessionSnapshotExposure';

const makeIngredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  scientific_name: 'Ascorbic Acid',
  common_name: 'Vitamin C',
  functional_purpose: 'Antioxidant',
  regulatory_context: 'Approved.',
  exposure_context: 'Safe.',
  science_note: 'Antioxidant.',
  literacy_flag: '',
  risk_family: null,
  status: 'safe',
  is_ai_generated: true,
  allergen_info: { is_match: false, alias_detected: null },
  ...overrides,
});

const makeEdc = (): EDCMatch => ({
  name: 'Methylparaben',
  family: 'Parabens',
  concern: 'Estrogen mimic',
  regulation: 'Restricted in EU',
  isRespiratoryHazard: false,
});

describe.skip('hasCompoundExposure', () => {
  it('returns false when ingredient has zero signals', () => {
    const ingredient = makeIngredient();
    expect(hasCompoundExposure(ingredient, null)).toBe(false);
  });

  it('returns false when only one signal is present (allergen only)', () => {
    const ingredient = makeIngredient({ allergen_info: { is_match: true, alias_detected: 'Milk' } });
    expect(hasCompoundExposure(ingredient, null)).toBe(false);
  });

  it('returns false when only one signal is present (risk_family only)', () => {
    const ingredient = makeIngredient({ risk_family: 'IRRITANT' });
    expect(hasCompoundExposure(ingredient, null)).toBe(false);
  });

  it('returns false when only one signal is present (EDC match only)', () => {
    const ingredient = makeIngredient();
    expect(hasCompoundExposure(ingredient, makeEdc())).toBe(false);
  });

  it('returns false when only one signal is present (warning status only)', () => {
    const ingredient = makeIngredient({ status: 'warning' });
    expect(hasCompoundExposure(ingredient, null)).toBe(false);
  });

  it('returns false when only one signal is present (avoid status only)', () => {
    const ingredient = makeIngredient({ status: 'avoid' });
    expect(hasCompoundExposure(ingredient, null)).toBe(false);
  });

  it('returns true when allergen + risk_family both present', () => {
    const ingredient = makeIngredient({
      allergen_info: { is_match: true, alias_detected: 'Egg' },
      risk_family: 'SENSITIZER',
    });
    expect(hasCompoundExposure(ingredient, null)).toBe(true);
  });

  it('returns true when allergen + EDC both present', () => {
    const ingredient = makeIngredient({ allergen_info: { is_match: true, alias_detected: 'Wheat' } });
    expect(hasCompoundExposure(ingredient, makeEdc())).toBe(true);
  });

  it('returns true when warning status + EDC both present', () => {
    const ingredient = makeIngredient({ status: 'warning' });
    expect(hasCompoundExposure(ingredient, makeEdc())).toBe(true);
  });

  it('returns true when avoid status + risk_family both present', () => {
    const ingredient = makeIngredient({ status: 'avoid', risk_family: 'CORROSIVE' });
    expect(hasCompoundExposure(ingredient, null)).toBe(true);
  });

  it('returns true when all four signals present', () => {
    const ingredient = makeIngredient({
      allergen_info: { is_match: true, alias_detected: 'Milk' },
      risk_family: 'IRRITANT',
      status: 'avoid',
    });
    expect(hasCompoundExposure(ingredient, makeEdc())).toBe(true);
  });

  it('does not count warning and avoid as two separate signals', () => {
    // status contributes at most 1 signal regardless of severity
    const ingredient = makeIngredient({ status: 'avoid' });
    expect(hasCompoundExposure(ingredient, null)).toBe(false);
  });

  it('returns false for unknown status even with no other signals', () => {
    const ingredient = makeIngredient({ status: 'unknown' });
    expect(hasCompoundExposure(ingredient, null)).toBe(false);
  });
});
