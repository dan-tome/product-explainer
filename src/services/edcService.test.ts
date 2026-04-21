import { checkEDC, isRespiratoryHazard } from './edcService';

describe('checkEDC', () => {
  it('returns null for a non-EDC ingredient', () => {
    expect(checkEDC('water')).toBeNull();
    expect(checkEDC('glycerin')).toBeNull();
    expect(checkEDC('ascorbic acid')).toBeNull();
  });

  it('detects methylparaben as EDC', () => {
    const result = checkEDC('methylparaben');
    expect(result).not.toBeNull();
    expect(result?.concern).toContain('paraben');
  });

  it('detects oxybenzone as EDC', () => {
    const result = checkEDC('oxybenzone');
    expect(result).not.toBeNull();
    expect(result?.family).toBe('UV Filter');
  });

  it('detects triclosan as EDC', () => {
    const result = checkEDC('triclosan');
    expect(result?.concern).toContain('antimicrobial');
  });

  it('detects BHA by both short name and full name', () => {
    expect(checkEDC('bha')).not.toBeNull();
    expect(checkEDC('butylated hydroxyanisole')).not.toBeNull();
  });

  it('is case-insensitive', () => {
    expect(checkEDC('Methylparaben')).not.toBeNull();
    expect(checkEDC('TRICLOSAN')).not.toBeNull();
  });

  it('returns the ingredient name on match', () => {
    const result = checkEDC('triclosan');
    expect(result?.ingredient).toBe('triclosan');
  });

  it('returns family and regulation on match', () => {
    const result = checkEDC('triclosan');
    expect(result?.family).toBe('Antimicrobial');
    expect(result?.regulation).toBeTruthy();
  });

  it('detects an alias listed as a secondary synonym (benzophenone-3 → oxybenzone entry)', () => {
    expect(checkEDC('benzophenone-3')).not.toBeNull();
  });

  it('detects phthalates by short-form alias (dep, dbp)', () => {
    expect(checkEDC('dep')?.family).toBe('Phthalate');
    expect(checkEDC('dbp')?.family).toBe('Phthalate');
  });

  // Toxicology Lead validated array (2026-04-21)
  it('detects all four Toxicology-Lead-validated EDCs', () => {
    expect(checkEDC('propylparaben')?.family).toBe('Paraben');
    expect(checkEDC('benzophenone-3')?.family).toBe('UV Filter');
    expect(checkEDC('bisphenol a')?.family).toBe('Bisphenol');
    expect(checkEDC('bpa')?.family).toBe('Bisphenol');
    expect(checkEDC('triclosan')?.family).toBe('Antimicrobial');
  });
});

describe('isRespiratoryHazard', () => {
  it('returns true for CORROSIVE risk_family', () => {
    expect(isRespiratoryHazard('Safe as used in neutralised products.', 'CORROSIVE')).toBe(true);
  });

  it('returns true when exposure_context mentions respiratory', () => {
    expect(isRespiratoryHazard('Avoid respiratory exposure. Use in ventilated area.', null)).toBe(true);
  });

  it('returns true when exposure_context mentions inhale', () => {
    expect(isRespiratoryHazard('Do not inhale fumes.', null)).toBe(true);
  });

  it('returns true when exposure_context mentions ventilat', () => {
    expect(isRespiratoryHazard('Use only in well-ventilated spaces.', null)).toBe(true);
  });

  it('returns false for safe, non-respiratory ingredients', () => {
    expect(isRespiratoryHazard('Safe for intended use.', null)).toBe(false);
    expect(isRespiratoryHazard('Safe for intended use.', 'IRRITANT')).toBe(false);
  });
});
