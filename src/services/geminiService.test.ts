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
    mockGenerateContent.mockResolvedValue({
      response: { text: () => '[]' },
    });
    await analyzeWithGemini(['Salt', 'Sugar']);
    const prompt = mockGenerateContent.mock.calls[0][0];
    expect(prompt).toContain('Salt');
    expect(prompt).toContain('Sugar');
  });

  it('returns parsed IngredientAnalysis array from Gemini JSON', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '[{"name":"Potatoes","status":"safe","info":"A root vegetable, low in fat."}]',
      },
    });
    const result = await analyzeWithGemini(['Potatoes']);
    expect(result).toEqual([
      { name: 'Potatoes', status: 'safe', info: 'A root vegetable, low in fat.' },
    ]);
  });

  it('corrects OCR errors via Gemini response name field', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '[{"name":"Powdered dried parsley","status":"safe","info":"A herb."}]',
      },
    });
    const result = await analyzeWithGemini(['Pewde dried parsely']);
    expect(result[0].name).toBe('Powdered dried parsley');
  });

  it('falls back to unknown status for each ingredient when Gemini returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'not valid json at all' },
    });
    const result = await analyzeWithGemini(['Salt', 'Sugar']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Salt', status: 'unknown', info: 'Could not analyze this ingredient.' });
    expect(result[1]).toEqual({ name: 'Sugar', status: 'unknown', info: 'Could not analyze this ingredient.' });
  });

  it('falls back to unknown status for each ingredient when Gemini call throws', async () => {
    mockGenerateContent.mockRejectedValue(new Error('network error'));
    const result = await analyzeWithGemini(['Salt']);
    expect(result[0].status).toBe('unknown');
    expect(result[0].name).toBe('Salt');
  });
});
