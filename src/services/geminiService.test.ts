jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(),
}));

import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeWithGemini } from './geminiService';

describe('analyzeWithGemini', () => {
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    mockGenerateContent = jest.fn();
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }));
  });

  it('returns empty array without calling Gemini when given no ingredients', async () => {
    const result = await analyzeWithGemini([]);
    expect(result).toEqual([]);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('includes all ingredients in the prompt', async () => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => '[]' } });
    await analyzeWithGemini(['Salt', 'Sugar']);
    const prompt = mockGenerateContent.mock.calls[0][0];
    expect(prompt).toContain('Salt');
    expect(prompt).toContain('Sugar');
  });

  const fullIngredientJSON = (overrides = {}) => JSON.stringify([{
    scientific_name: 'Solanum tuberosum',
    common_name: 'Potato',
    functional_purpose: 'Provides sustained energy - Carbohydrate source',
    regulatory_context: 'Natural food ingredient, no restrictions.',
    exposure_context: 'Safe for intended use.',
    science_note: 'A starchy tuber rich in complex carbohydrates.',
    literacy_flag: 'Potatoes are the world\'s fourth-largest food crop.',
    risk_family: null,
    status: 'safe',
    ...overrides,
  }]);

  it('returns parsed Ingredient array from Gemini JSON', async () => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => fullIngredientJSON() } });
    const result = await analyzeWithGemini(['Potatoes']);
    expect(result[0].common_name).toBe('Potato');
    expect(result[0].scientific_name).toBe('Solanum tuberosum');
    expect(result[0].status).toBe('safe');
    expect(result[0].is_ai_generated).toBe(true);
    expect(result[0].risk_family).toBeNull();
  });

  it('maps CORROSIVE risk_family from Gemini response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => fullIngredientJSON({ risk_family: 'CORROSIVE', status: 'warning' }) },
    });
    const result = await analyzeWithGemini(['Sodium Hydroxide']);
    expect(result[0].risk_family).toBe('CORROSIVE');
  });

  it('coerces unknown risk_family values to null', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => fullIngredientJSON({ risk_family: 'EXPLOSIVE' }) },
    });
    const result = await analyzeWithGemini(['Unknown chemical']);
    expect(result[0].risk_family).toBeNull();
  });

  it('corrects OCR errors via Gemini response common_name field', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify([{
          scientific_name: 'Carum petroselinum',
          common_name: 'Powdered dried parsley',
          functional_purpose: 'Adds herbal flavour - Flavouring',
          regulatory_context: 'Natural herb, no restrictions.',
          exposure_context: 'Safe for intended use.',
          science_note: 'Rich in volatile oils that provide characteristic flavour.',
          literacy_flag: '',
          risk_family: null,
          status: 'safe',
        }]),
      },
    });
    const result = await analyzeWithGemini(['Pewde dried parsely']);
    expect(result[0].common_name).toBe('Powdered dried parsley');
  });

  it('falls back gracefully when Gemini returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => 'not valid json at all' } });
    const result = await analyzeWithGemini(['Salt', 'Sugar']);
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('unknown');
    expect(result[0].scientific_name).toBe('Salt');
    expect(result[1].scientific_name).toBe('Sugar');
  });

  it('falls back gracefully when Gemini call throws', async () => {
    mockGenerateContent.mockRejectedValue(new Error('network error'));
    const result = await analyzeWithGemini(['Salt']);
    expect(result[0].status).toBe('unknown');
    expect(result[0].scientific_name).toBe('Salt');
    expect(result[0].is_ai_generated).toBe(true);
  });

  it('includes product type context in the prompt for COSMETIC', async () => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => '[]' } });
    await analyzeWithGemini(['Dimethicone'], 'COSMETIC');
    const prompt = mockGenerateContent.mock.calls[0][0];
    expect(prompt).toContain('cosmetic');
  });
});
