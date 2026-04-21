import { Ingredient } from '../types/product';
import type { EDCMatch } from '../services/edcService';

/**
 * Prototype: “compound exposure” = multiple independent signals on one ingredient
 * (session-level story), not a clinical threshold.
 */
export function hasCompoundExposure(ingredient: Ingredient, edcMatch: EDCMatch | null): boolean {
  let signals = 0;
  if (ingredient.allergen_info.is_match) signals += 1;
  if (ingredient.risk_family !== null) signals += 1;
  if (edcMatch !== null) signals += 1;
  if (ingredient.status === 'warning' || ingredient.status === 'avoid') signals += 1;
  return signals >= 2;
}
