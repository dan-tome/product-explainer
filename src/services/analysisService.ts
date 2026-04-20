import ingredientsData from '../data/ingredients.json';

export type IngredientStatus = 'safe' | 'warning' | 'avoid' | 'unknown';

export interface IngredientAnalysis {
  name: string;
  status: IngredientStatus;
  info: string;
}

const typedIngredientsData = ingredientsData as Record<string, { status: string; info: string }>;

export const analyzeIngredients = (text: string): IngredientAnalysis[] => {
  if (!text) return [];

  // Split by commas, dots, or newlines and clean up
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
