import { GoogleGenerativeAI } from '@google/generative-ai';
import { IngredientAnalysis } from './analysisService';

const PROMPT = `You are a food ingredient analyst. You will be given a list of ingredients parsed from a food label via OCR — they may contain OCR errors or misspellings.

For each ingredient:
1. Correct any obvious OCR errors or misspellings
2. Classify it as: safe, warning, avoid, or unknown
3. Provide a 1-2 sentence explanation

Respond with a JSON array only, no markdown:
[{"name": "corrected name", "status": "safe|warning|avoid|unknown", "info": "explanation"}, ...]

Ingredients:
`;

export const analyzeWithGemini = async (ingredients: string[]): Promise<IngredientAnalysis[]> => {
  if (ingredients.length === 0) return [];

  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
