import { GoogleGenerativeAI } from '@google/generative-ai';
import { IngredientAnalysis } from './analysisService';

const PROMPT = `You are a food ingredient analyst. You will be given a list of tokens parsed from a food label via OCR — they may contain OCR errors or misspellings.

For each token:
1. If it is clearly not a food ingredient (garbled text, brand names, marketing copy, partial words), omit it from the response entirely.
2. Otherwise, correct any OCR errors or misspellings in the name.
3. Classify it as: safe, warning, avoid, or unknown.
4. Provide a 1-2 sentence explanation.

Respond with a JSON array only, no markdown:
[{"name": "corrected name", "status": "safe|warning|avoid|unknown", "info": "explanation"}, ...]

Tokens:
`;

export const analyzeWithGemini = async (ingredients: string[]): Promise<IngredientAnalysis[]> => {
  if (ingredients.length === 0) return [];

  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    const result = await model.generateContent(PROMPT + ingredients.join('\n'));
    const parsed = JSON.parse(result.response.text());
    return parsed as IngredientAnalysis[];
  } catch {
    return ingredients.map(name => ({
      name,
      status: 'unknown' as const,
      info: 'Could not analyze this ingredient.',
    }));
  }
};
