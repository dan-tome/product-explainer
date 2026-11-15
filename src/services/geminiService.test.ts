jest.mock('@google/generative-ai', () => ({
  ...jest.requireActual('@google/generative-ai'),
  GoogleGenerativeAI: jest.fn(),
}));

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  GEMINI_MAX_ATTEMPTS,
  GEMINI_TIMEOUT_MS,
  INGREDIENT_RESPONSE_SCHEMA,
  analyzeWithGemini,
  joinByToken,
  parseGeminiResponse,
} from './geminiService';

describe('analyzeWithGemini', () => {
  let mockGenerateContent: jest.Mock;
  let mockGetGenerativeModel: jest.Mock;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockGenerateContent = jest.fn();
    mockGetGenerativeModel = jest.fn().mockReturnValue({ generateContent: mockGenerateContent });
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => warnSpy.mockRestore());

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

  const fullIngredientJSON = (overrides = {}) =>
    JSON.stringify([
      {
        scientific_name: 'Solanum tuberosum',
        common_name: 'Potato',
        functional_purpose: 'Provides sustained energy - Carbohydrate source',
        regulatory_context: 'Natural food ingredient, no restrictions.',
        exposure_context: 'Safe for intended use.',
        science_note: 'A starchy tuber rich in complex carbohydrates.',
        literacy_flag: "Potatoes are the world's fourth-largest food crop.",
        risk_family: null,
        status: 'safe',
        ...overrides,
      },
    ]);

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
        text: () =>
          JSON.stringify([
            {
              scientific_name: 'Carum petroselinum',
              common_name: 'Powdered dried parsley',
              functional_purpose: 'Adds herbal flavour - Flavouring',
              regulatory_context: 'Natural herb, no restrictions.',
              exposure_context: 'Safe for intended use.',
              science_note: 'Rich in volatile oils that provide characteristic flavour.',
              literacy_flag: '',
              risk_family: null,
              status: 'safe',
            },
          ]),
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

  describe('structured output and resilience', () => {
    const reply = (entries: object[]) => ({ response: { text: () => JSON.stringify(entries) } });

    it('requests JSON constrained by the ingredient schema, with a timeout', async () => {
      mockGenerateContent.mockResolvedValue(reply([]));
      await analyzeWithGemini(['salt']);
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: INGREDIENT_RESPONSE_SCHEMA,
          },
        }),
        { timeout: GEMINI_TIMEOUT_MS },
      );
    });

    it('asks the model to echo the source token', async () => {
      mockGenerateContent.mockResolvedValue(reply([]));
      await analyzeWithGemini(['salt']);
      expect(mockGenerateContent.mock.calls[0][0]).toContain('"source_token"');
    });

    it('pairs each explanation with its own token when the model drops a non-ingredient', async () => {
      // Regression: the old code joined by array index, so dropping "net wt 200g" shifted
      // every later result onto the wrong token.
      mockGenerateContent.mockResolvedValue(
        reply([
          { source_token: 'sugar', common_name: 'Sugar', status: 'safe' },
          { source_token: 'salt', status: 'safe' }, // names missing: must fall back to "salt"
        ]),
      );
      const result = await analyzeWithGemini(['salt', 'net wt 200g', 'sugar']);
      expect(result.map(r => [r.scientific_name, r.common_name])).toEqual([
        ['salt', 'salt'],
        ['sugar', 'Sugar'],
      ]);
    });

    it('retries once when the first call fails', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(
          reply([{ source_token: 'salt', common_name: 'Table salt', status: 'safe' }]),
        );
      const result = await analyzeWithGemini(['salt']);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result[0].common_name).toBe('Table salt');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('retries once when the response is not a JSON array', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ response: { text: () => '{"oops":true}' } })
        .mockResolvedValueOnce(
          reply([{ source_token: 'salt', common_name: 'Table salt', status: 'safe' }]),
        );
      const result = await analyzeWithGemini(['salt']);
      expect(result[0].common_name).toBe('Table salt');
    });

    it(`gives up after ${GEMINI_MAX_ATTEMPTS} attempts, logs, and returns unexplained tokens`, async () => {
      mockGenerateContent.mockRejectedValue(new Error('network error'));
      const result = await analyzeWithGemini(['salt', 'sugar']);
      expect(mockGenerateContent).toHaveBeenCalledTimes(GEMINI_MAX_ATTEMPTS);
      expect(result.map(r => [r.scientific_name, r.status])).toEqual([
        ['salt', 'unknown'],
        ['sugar', 'unknown'],
      ]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe('joinByToken', () => {
  it('discards entries whose source_token was never sent (hallucination guard)', () => {
    const result = joinByToken(
      ['water'],
      [
        { source_token: 'water', common_name: 'Water' },
        { source_token: 'arsenic', common_name: 'Arsenic' },
      ],
    );
    expect(result.map(r => r.common_name)).toEqual(['Water']);
  });

  it('matches tokens case- and whitespace-insensitively', () => {
    const result = joinByToken(
      ['sodium  benzoate'],
      [{ source_token: ' Sodium Benzoate', common_name: 'Preservative' }],
    );
    expect(result[0].common_name).toBe('Preservative');
  });

  it('keeps input order regardless of response order', () => {
    const result = joinByToken(
      ['a-one', 'b-two', 'c-three'],
      [
        { source_token: 'c-three', common_name: 'C' },
        { source_token: 'a-one', common_name: 'A' },
        { source_token: 'b-two', common_name: 'B' },
      ],
    );
    expect(result.map(r => r.common_name)).toEqual(['A', 'B', 'C']);
  });

  it('assigns duplicate tokens to separate entries in order', () => {
    const result = joinByToken(
      ['citric acid', 'citric acid'],
      [
        { source_token: 'citric acid', functional_purpose: 'first' },
        { source_token: 'citric acid', functional_purpose: 'second' },
      ],
    );
    expect(result.map(r => r.functional_purpose)).toEqual(['first', 'second']);
  });

  it('never borrows a neighbouring token for legacy responses with a different count', () => {
    const result = joinByToken(
      ['salt', 'junk', 'sugar'],
      [{ common_name: 'Sugar' }, { status: 'safe' }],
    );
    expect(result).toHaveLength(1);
    expect(result[0].scientific_name).toBe('Sugar');
  });
});

describe('parseGeminiResponse', () => {
  it('rejects a non-array payload', () => {
    expect(() => parseGeminiResponse('{"a":1}')).toThrow('not a JSON array');
  });

  it('drops non-object entries and non-string field values', () => {
    const entries = parseGeminiResponse(
      JSON.stringify([42, null, { common_name: 123, scientific_name: 'Glycerin', status: 'safe' }]),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].common_name).toBeUndefined();
    expect(entries[0].scientific_name).toBe('Glycerin');
  });
});
