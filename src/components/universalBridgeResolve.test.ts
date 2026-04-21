import {
  detectSynergy,
  isCompoundGroupMember,
  resolveAggregateBridge,
} from './universalBridgeResolve';
import { Ingredient } from '../types/product';

const base = (): Omit<Ingredient, 'scientific_name' | 'common_name'> => ({
  functional_purpose: 'Test - action',
  regulatory_context: 'Approved.',
  exposure_context: 'Safe.',
  science_note: 'Note.',
  literacy_flag: '',
  risk_family: null,
  status: 'safe',
  is_ai_generated: true,
  allergen_info: { is_match: false, alias_detected: null },
});

describe('universalBridgeResolve — synergy (Tier 2)', () => {
  it('activates when thyroid-pathway (Resorcinol) and estrogen-pathway (Oxybenzone) co-occur', () => {
    const ingredients: Ingredient[] = [
      { ...base(), scientific_name: 'Resorcinol', common_name: 'Resorcinol' },
      { ...base(), scientific_name: 'Oxybenzone', common_name: 'Oxybenzone' },
    ];
    expect(detectSynergy(ingredients)).toBe(true);
    const r = resolveAggregateBridge(ingredients);
    expect(r.synergyActive).toBe(true);
    expect(r.cumulativeNote?.title).toMatch(/cumulative/i);
    expect(r.validatedFamily).toBeNull();
  });

  it('flags compound-group members when synergy is active', () => {
    const res: Ingredient = { ...base(), scientific_name: 'Resorcinol', common_name: 'Resorcinol' };
    const oxy: Ingredient = { ...base(), scientific_name: 'Oxybenzone', common_name: 'Oxybenzone' };
    expect(isCompoundGroupMember(res, true)).toBe(true);
    expect(isCompoundGroupMember(oxy, true)).toBe(true);
    expect(isCompoundGroupMember(res, false)).toBe(false);
  });

  it('does not activate synergy with only one pathway', () => {
    const ingredients: Ingredient[] = [{ ...base(), scientific_name: 'Oxybenzone', common_name: 'Oxybenzone' }];
    expect(detectSynergy(ingredients)).toBe(false);
    const r = resolveAggregateBridge(ingredients);
    expect(r.synergyActive).toBe(false);
    expect(r.cumulativeNote).toBeNull();
  });
});
