import { Easing } from 'react-native';

const standardCurve = Easing.bezier(0.4, 0.0, 0.2, 1);
const allergenCurve = Easing.bezier(0.2, 0.0, 0, 1);

/** Behavioral scaffold — disclosure & skeleton motion (Material-style + allergen urgency). */
export const MOTION = {
  standardRevealMs: 260,
  allergenMatchMs: 180,
  collapseMs: 200,
  /** Offset between staggered hydrate steps (header → purpose, etc.) */
  hydrateStaggerMs: 72,
  /** Standard reveal — e.g. L3, skeleton pulse */
  easingStandard: standardCurve,
  /** Allergen-first expand — faster, sharper deceleration */
  easingAllergen: allergenCurve,
  /** IngredientCard L2 expand — default (use instead of a shared `Easing` constant in UI code) */
  l2RevealCurve: standardCurve,
  /** IngredientCard L2 expand — allergen match (snappier) */
  l2RevealCurveAllergen: allergenCurve,
} as const;
