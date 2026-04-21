import ingredientsData from '../data/ingredients.json';

export type IngredientStatus = 'safe' | 'warning' | 'avoid' | 'unknown';

export interface IngredientAnalysis {
  name: string;
  status: IngredientStatus;
  info: string;
}

const typedIngredientsData = ingredientsData as Record<string, { status: string; info: string }>;

const extractIngredientsSection = (text: string): string => {
  const match = text.match(/ingredients[:\s]+(.+?)(?:\n{2,}|allergen|contains:|nutrition|$)/is);
  return match ? match[1] : text;
};

const removeParentheticals = (text: string): string => {
  let result = text;
  let prev = '';
  while (prev !== result) {
    prev = result;
    result = result.replace(/\([^()]*\)/g, '').replace(/\[[^\[\]]*\]/g, '');
  }
  return result;
};

const normalizeText = (text: string): string =>
  removeParentheticals(text)
    .replace(/[|\n\r]+/g, ',')
    .replace(/,{2,}/g, ',');

export const analyzeIngredients = (text: string): IngredientAnalysis[] => {
  if (!text) return [];

  const section = extractIngredientsSection(text);
  const rawIngredients = normalizeText(section)
    .split(',')
    .map(i => i.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter(i => i.length > 2 && /^[a-z]/i.test(i));

  return rawIngredients.map(name => {
    const matched = Object.keys(typedIngredientsData).find(key =>
      name.includes(key) || key.includes(name)
    );

    if (matched) {
      const data = typedIngredientsData[matched];
      return {
        name,
        status: data.status as IngredientStatus,
        info: data.info,
      };
    }

    return {
      name,
      status: 'unknown',
      info: 'No information available for this ingredient.',
    };
  });
};
