import { Ingredient } from '../types/product';
import { checkEDC } from '../services/edcService';
import type { AggregateBridgeResult, CumulativeResearchNote, ValidatedFamilySignal } from '../types/universalBridge';

/** Toxicology Phase D — pathway markers (canonical alias substrings). */
const THYROID_PATHWAY_MARKERS = ['resorcinol'] as const;
const ESTROGEN_PATHWAY_MARKERS = ['oxybenzone', 'benzophenone-3'] as const;

function pool(ing: Ingredient): string {
  return `${ing.scientific_name} ${ing.common_name}`.toLowerCase();
}

function matchesPathwayMarkers(ing: Ingredient, markers: readonly string[]): boolean {
  const p = pool(ing);
  for (const m of markers) {
    if (p.includes(m)) return true;
    const a = checkEDC(ing.scientific_name.trim());
    const b = checkEDC(ing.common_name.trim());
    for (const e of [a, b]) {
      if (e && e.ingredient.toLowerCase().includes(m)) return true;
    }
  }
  return false;
}

export function hasThyroidPathwayHit(ingredients: Ingredient[]): boolean {
  return ingredients.some(i => matchesPathwayMarkers(i, THYROID_PATHWAY_MARKERS));
}

export function hasEstrogenPathwayHit(ingredients: Ingredient[]): boolean {
  return ingredients.some(i => matchesPathwayMarkers(i, ESTROGEN_PATHWAY_MARKERS));
}

/** Synergy: both endocrine pathways present in one scan (canary calibration). */
export function detectSynergy(ingredients: Ingredient[]): boolean {
  return hasThyroidPathwayHit(ingredients) && hasEstrogenPathwayHit(ingredients);
}

export function isCompoundGroupMember(ingredient: Ingredient, synergyActive: boolean): boolean {
  if (!synergyActive) return false;
  return (
    matchesPathwayMarkers(ingredient, THYROID_PATHWAY_MARKERS) ||
    matchesPathwayMarkers(ingredient, ESTROGEN_PATHWAY_MARKERS)
  );
}

function buildCumulativeNote(): CumulativeResearchNote {
  return {
    title: 'Cumulative research note',
    body:
      'This scan links thyroid- and estrogen-pathway signals (Resorcinol-class and Oxybenzone-class). They’re read together for aggregate context — not as isolated verdicts.',
  };
}

function firstSinglePathEdcNote(ingredients: Ingredient[]): ValidatedFamilySignal | null {
  for (const ing of ingredients) {
    const m = checkEDC(ing.scientific_name) ?? checkEDC(ing.common_name);
    if (m) {
      const detail = m.concern.length > 140 ? `${m.concern.slice(0, 137)}…` : m.concern;
      return {
        familyId: 'edc',
        label: m.family || 'Science-tracked family',
        detail,
      };
    }
  }
  return null;
}

/**
 * Tier 2 aggregate resolver: synergy replaces the standard top Science Note with a cumulative note.
 */
export function resolveAggregateBridge(ingredients: Ingredient[]): AggregateBridgeResult {
  const synergyActive = detectSynergy(ingredients);

  if (synergyActive) {
    return {
      validatedFamily: null,
      synergyActive: true,
      cumulativeNote: buildCumulativeNote(),
    };
  }

  return {
    validatedFamily: firstSinglePathEdcNote(ingredients),
    synergyActive: false,
    cumulativeNote: null,
  };
}

/** @deprecated Use resolveAggregateBridge — retained for narrow call sites */
export function resolveValidatedFamilyForUi(ingredients: Ingredient[]): ValidatedFamilySignal | null {
  return resolveAggregateBridge(ingredients).validatedFamily;
}
