jest.mock('./geminiService', () => ({
  analyzeWithGemini: jest.fn(),
}));

import { analyzeWithGemini } from './geminiService';
import { analyzeIngredients } from './analysisService';

const mockAnalyzeWithGemini = analyzeWithGemini as jest.Mock;

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
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['water', 'salt']);
  });

  it('returns the results from Gemini', async () => {
    mockAnalyzeWithGemini.mockResolvedValue([
      { name: 'Water', status: 'safe', info: 'Essential for life.' },
    ]);
    const result = await analyzeIngredients('INGREDIENTS: Water');
    expect(result).toEqual([{ name: 'Water', status: 'safe', info: 'Essential for life.' }]);
  });

  it('strips parenthetical sub-ingredients before passing to Gemini', async () => {
    await analyzeIngredients('INGREDIENTS: Vegetable Oils (Sunflower, Rapeseed), Salt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['vegetable oils', 'salt']);
  });

  it('normalises pipe separators before passing to Gemini', async () => {
    await analyzeIngredients('INGREDIENTS: Potatoes | Salt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['potatoes', 'salt']);
  });

  it('normalises newline separators before passing to Gemini', async () => {
    await analyzeIngredients('INGREDIENTS: Potatoes\nSalt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['potatoes', 'salt']);
  });

  it('filters tokens shorter than 4 chars or not starting with two letters', async () => {
    await analyzeIngredients('INGREDIENTS: Water, 150g Sugar, Ab, Salt');
    const called = mockAnalyzeWithGemini.mock.calls[0][0];
    expect(called).toContain('water');
    expect(called).toContain('salt');
    expect(called).not.toContain('150g sugar');
    expect(called).not.toContain('ab');
  });
});
