jest.mock('./geminiService', () => ({
  analyzeWithGemini: jest.fn(),
}));

import { analyzeWithGemini } from './geminiService';
import { analyzeIngredients } from './analysisService';
import { Ingredient } from '../types/product';

const mockAnalyzeWithGemini = analyzeWithGemini as jest.Mock;

const makeGeminiIngredient = (name: string): Omit<Ingredient, 'allergen_info'> => ({
  scientific_name: name,
  common_name: name,
  functional_purpose: `Provides ${name} benefit - Function`,
  regulatory_context: 'Approved.',
  exposure_context: 'Safe for intended use.',
  science_note: 'No specific science note.',
  literacy_flag: '',
  risk_family: null,
  status: 'safe',
  is_ai_generated: true,
});

describe('analyzeIngredients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyzeWithGemini.mockResolvedValue([]);
  });

  it('returns empty array for empty string without calling Gemini', async () => {
    const result = await analyzeIngredients('');
    expect(result).toEqual([]);
    expect(mockAnalyzeWithGemini).not.toHaveBeenCalled();
  });

  it('extracts ingredient tokens from INGREDIENTS: section and passes them to Gemini', async () => {
    await analyzeIngredients('INGREDIENTS: Water, Salt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['water', 'salt'], 'UNKNOWN');
  });

  it('normalises Latin/French INCI synonyms (e.g. Parfum → fragrance) before tokenization', async () => {
    await analyzeIngredients('INGREDIENTS: Parfum, Salt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['fragrance', 'salt'], 'UNKNOWN');
  });

  it('returns the results from Gemini enriched with allergen_info', async () => {
    mockAnalyzeWithGemini.mockResolvedValue([makeGeminiIngredient('Water')]);
    const result = await analyzeIngredients('INGREDIENTS: Water');
    expect(result[0].common_name).toBe('Water');
    expect(result[0].status).toBe('safe');
    expect(result[0].allergen_info).toEqual({ is_match: false, alias_detected: null });
  });

  it('detects allergen and sets is_match when ingredient is a known allergen', async () => {
    mockAnalyzeWithGemini.mockResolvedValue([makeGeminiIngredient('caseinate')]);
    const result = await analyzeIngredients('INGREDIENTS: Caseinate');
    expect(result[0].allergen_info.is_match).toBe(true);
    expect(result[0].allergen_info.alias_detected).toBe('Milk');
  });

  it('strips parenthetical sub-ingredients before passing to Gemini', async () => {
    await analyzeIngredients('INGREDIENTS: Vegetable Oils (Sunflower, Rapeseed), Salt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['vegetable oils', 'salt'], 'UNKNOWN');
  });

  it('normalises pipe separators before passing to Gemini', async () => {
    await analyzeIngredients('INGREDIENTS: Potatoes | Salt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['potatoes', 'salt'], 'UNKNOWN');
  });

  it('normalises newline separators before passing to Gemini', async () => {
    await analyzeIngredients('INGREDIENTS: Potatoes\nSalt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['potatoes', 'salt'], 'UNKNOWN');
  });

  it('filters tokens shorter than 4 chars or not starting with two letters', async () => {
    await analyzeIngredients('INGREDIENTS: Water, 150g Sugar, Ab, Salt');
    const called = mockAnalyzeWithGemini.mock.calls[0][0];
    expect(called).toContain('water');
    expect(called).toContain('salt');
    expect(called).not.toContain('150g sugar');
    expect(called).not.toContain('ab');
  });

  it('detects FOOD product type from nutrition facts keywords', async () => {
    await analyzeIngredients('Nutrition Facts Water, Salt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(expect.any(Array), 'FOOD');
  });
});
