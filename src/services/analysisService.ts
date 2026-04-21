import ingredientsData from '../data/ingredients.json';

export type IngredientStatus = 'safe' | 'warning' | 'avoid' | 'unknown';

export interface IngredientAnalysis {
  name: string;
  status: IngredientStatus;
  info: string;
}

const typedIngredientsData = ingredientsData as Record<string, { status: string; info: string }>;
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

/**
 * Fallback local analysis using ingredients.json
 */
const localAnalyze = (text: string): IngredientAnalysis[] => {
  if (!text) return [];

  const rawIngredients = text.split(/[,.\n]/).map(i => i.trim().toLowerCase()).filter(i => i.length > 0);
  
  return rawIngredients.map(name => {
    const matched = Object.keys(typedIngredientsData).find(key => 
      name.includes(key) || key.includes(name)
    );

    if (matched) {
      const data = typedIngredientsData[matched];
      return {
        name: name,
        status: data.status as IngredientStatus,
        info: data.info,
      };
    }

    return {
      name: name,
      status: 'unknown',
      info: 'No information available for this ingredient.',
    };
  });
};

/**
 * AI-driven analysis using OpenAI.
 * 
 * GAP: LLM analysis can be slow and requires an API key. 
 * The current implementation provides a local fallback (localAnalyze) using 
 * ingredients.json for basic offline functionality and cost reduction.
 */
export const analyzeIngredients = async (text: string): Promise<IngredientAnalysis[]> => {
  if (!text) return [];

  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key is missing. Falling back to local analysis.');
    return localAnalyze(text);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert nutritionist. Analyze the following list of ingredients and return a JSON array of objects. Each object should have: "name" (string), "status" ("safe", "warning", or "avoid"), and "info" (a brief explanation of what it is and why it has that status). Focus on health impact.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    // The model might return the array under a key like "ingredients"
    const results = Array.isArray(parsed) ? parsed : (parsed.ingredients || Object.values(parsed)[0]);
    
    return results as IngredientAnalysis[];
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return localAnalyze(text);
  }
};
