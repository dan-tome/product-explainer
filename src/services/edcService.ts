import { EDC_ENTRIES } from '../data/edcData';

export interface EDCMatch {
  ingredient: string;
  concern: string;
  family: string;
  regulation: string;
}

// Build the O(1) lookup Map from the data file at module load time.
// Each alias maps to the full EDCEntry so no secondary lookup is needed.
const EDC_MAP = new Map<string, { concern: string; family: string; regulation: string }>();

for (const entry of EDC_ENTRIES) {
  for (const alias of entry.aliases) {
    EDC_MAP.set(alias.toLowerCase(), {
      concern: entry.concern,
      family: entry.family,
      regulation: entry.regulation,
    });
  }
}

/**
 * Checks a single ingredient name against the EDC alias map.
 * O(1) Map lookup. Returns an EDCMatch if found, otherwise null.
 */
export const checkEDC = (ingredient: string): EDCMatch | null => {
  const key = ingredient.toLowerCase().trim();
  const entry = EDC_MAP.get(key);
  if (!entry) return null;
  return { ingredient, ...entry };
};

/**
 * Returns true when the ingredient's exposure_context or risk_family indicates
 * a respiratory hazard requiring the ventilation advisory.
 */
export const isRespiratoryHazard = (exposureContext: string, riskFamily: string | null): boolean => {
  if (riskFamily === 'CORROSIVE') return true;
  const lower = exposureContext.toLowerCase();
  return (
    lower.includes('respiratory') ||
    lower.includes('inhale') ||
    lower.includes('ventilat') ||
    lower.includes('fume')
  );
};
