import { analyzeIngredients } from './analysisService';

describe('analyzeIngredients', () => {
  it('returns empty array for empty string', () => {
    expect(analyzeIngredients('')).toEqual([]);
  });

  it('identifies a known safe ingredient', () => {
    const results = analyzeIngredients('Water');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('safe');
    expect(results[0].name).toBe('water');
  });

  it('identifies a known avoid ingredient', () => {
    const results = analyzeIngredients('Sugar');
    expect(results[0].status).toBe('avoid');
  });

  it('identifies a known warning ingredient', () => {
    const results = analyzeIngredients('Palm Oil');
    expect(results[0].status).toBe('warning');
  });

  it('marks unknown ingredients as unknown', () => {
    const results = analyzeIngredients('Unobtainium');
    expect(results[0].status).toBe('unknown');
    expect(results[0].info).toBe('No information available for this ingredient.');
  });

  it('splits a comma-separated ingredient list', () => {
    const results = analyzeIngredients('Water, Sugar, Salt');
    expect(results).toHaveLength(3);
  });

  it('returns correct statuses for a realistic label scan', () => {
    const scan = 'Water, Sugar, Maltodextrin, Palm Oil, Salt, Citric Acid, Soy Lecithin';
    const results = analyzeIngredients(scan);
    const byName = Object.fromEntries(results.map(r => [r.name, r.status]));

    expect(byName['water']).toBe('safe');
    expect(byName['sugar']).toBe('avoid');
    expect(byName['maltodextrin']).toBe('warning');
    expect(byName['citric acid']).toBe('safe');
  });

  it('is case-insensitive', () => {
    const lower = analyzeIngredients('water')[0].status;
    const upper = analyzeIngredients('WATER')[0].status;
    const mixed = analyzeIngredients('Water')[0].status;
    expect(lower).toBe('safe');
    expect(upper).toBe('safe');
    expect(mixed).toBe('safe');
  });
});

describe('analyzeIngredients — parser improvements', () => {
  it('strips parenthetical sub-ingredients before splitting', () => {
    const text = 'INGREDIENTS: Vegetable Oils (Sunflower, Rapeseed), Salt, Citric Acid';
    const results = analyzeIngredients(text);
    const names = results.map(r => r.name);
    expect(names).toContain('vegetable oils');
    expect(names).toContain('salt');
    expect(names).toContain('citric acid');
    expect(names.some(n => n.includes('sunflower'))).toBe(false);
    expect(names.some(n => n.includes('rapeseed'))).toBe(false);
  });

  it('strips nested parentheticals', () => {
    const text = 'INGREDIENTS: Colour (Paprika Extract (contains Citric Acid)), Salt';
    const results = analyzeIngredients(text);
    const names = results.map(r => r.name);
    expect(names).toContain('colour');
    expect(names).toContain('salt');
    expect(names.some(n => n.includes('paprika extract'))).toBe(false);
  });

  it('strips square-bracket sub-ingredients', () => {
    const text = 'INGREDIENTS: Seasoning [Sugar, Garlic], Water';
    const results = analyzeIngredients(text);
    const names = results.map(r => r.name);
    expect(names).toContain('seasoning');
    expect(names).toContain('water');
    expect(names.some(n => n.includes('sugar') || n.includes('garlic'))).toBe(false);
  });

  it('normalises pipe characters to comma separators', () => {
    const text = 'INGREDIENTS: Potatoes | Salt | Citric Acid';
    const results = analyzeIngredients(text);
    expect(results).toHaveLength(3);
  });

  it('normalises newlines to comma separators', () => {
    const text = 'INGREDIENTS: Potatoes\nSalt\nCitric Acid';
    const results = analyzeIngredients(text);
    expect(results).toHaveLength(3);
  });

  it('filters out tokens that do not start with a letter', () => {
    const text = 'INGREDIENTS: Water, 150g Sugar, Salt';
    const results = analyzeIngredients(text);
    const names = results.map(r => r.name);
    expect(names).not.toContain('150g sugar');
    expect(names).toContain('water');
    expect(names).toContain('salt');
  });
});
