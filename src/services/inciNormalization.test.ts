import { applyInciSynonymsToLabelText } from './inciNormalization';

describe('applyInciSynonymsToLabelText', () => {
  it('returns empty string unchanged', () => {
    expect(applyInciSynonymsToLabelText('')).toBe('');
  });

  it('returns plain English text unchanged', () => {
    const text = 'Water, Salt, Sugar';
    expect(applyInciSynonymsToLabelText(text)).toBe(text);
  });

  // Water synonyms
  it('replaces "Eau" with "water" (case-insensitive)', () => {
    expect(applyInciSynonymsToLabelText('Eau, Salt')).toBe('water, Salt');
  });

  it('replaces "d\'eau" with "water"', () => {
    expect(applyInciSynonymsToLabelText("Extrait d'eau, Salt")).toBe('Extrait water, Salt');
  });

  it('replaces "de l\'eau" with "water"', () => {
    expect(applyInciSynonymsToLabelText("Jus de l'eau")).toBe('Jus water');
  });

  it('replaces "agua" with "water"', () => {
    expect(applyInciSynonymsToLabelText('Agua, Sal')).toBe('water, Sal');
  });

  it('replaces "água" (with accent) with "water"', () => {
    expect(applyInciSynonymsToLabelText('Água, Sal')).toBe('water, Sal');
  });

  // Fragrance synonyms
  it('replaces "Parfum" with "fragrance"', () => {
    expect(applyInciSynonymsToLabelText('Parfum, Water')).toBe('fragrance, Water');
  });

  it('replaces "Parfums" (plural) with "fragrance"', () => {
    expect(applyInciSynonymsToLabelText('Parfums, Water')).toBe('fragrance, Water');
  });

  it('replaces "Parfume" with "fragrance"', () => {
    expect(applyInciSynonymsToLabelText('Parfume, Water')).toBe('fragrance, Water');
  });

  it('replaces "Parfum (Fragrance)" with "fragrance"', () => {
    expect(applyInciSynonymsToLabelText('Parfum (Fragrance), Water')).toBe('fragrance, Water');
  });

  it('leaves standalone "fragrance" unchanged', () => {
    expect(applyInciSynonymsToLabelText('Fragrance, Water')).toBe('fragrance, Water');
  });

  // Oil synonyms
  it('replaces "Huile" with "oil"', () => {
    expect(applyInciSynonymsToLabelText('Huile, Water')).toBe('oil, Water');
  });

  it('replaces "Huile minérale" with "mineral oil"', () => {
    expect(applyInciSynonymsToLabelText('Huile minérale, Water')).toBe('mineral oil, Water');
  });

  it('replaces "Huile minerale" (without accent) with "mineral oil"', () => {
    expect(applyInciSynonymsToLabelText('Huile minerale, Water')).toBe('mineral oil, Water');
  });

  it('replaces "Aceite" with "oil"', () => {
    expect(applyInciSynonymsToLabelText('Aceite de Palma')).toBe('oil de Palma');
  });

  // Multiple replacements in one string
  it('applies multiple replacements in a single pass', () => {
    const input = 'Eau, Parfum, Huile';
    const result = applyInciSynonymsToLabelText(input);
    expect(result).toBe('water, fragrance, oil');
  });

  // Word boundary: does not replace inside longer words
  it('does not replace "eau" inside a longer word', () => {
    const result = applyInciSynonymsToLabelText('plateau');
    expect(result).toBe('plateau');
  });
});
