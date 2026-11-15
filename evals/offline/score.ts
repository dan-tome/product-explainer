import { prepareLabel } from '../../src/services/analysisService';
import { checkAllergen } from '../../src/services/allergenService';
import { checkEDC } from '../../src/services/edcService';
import type { GoldenCase } from '../golden/cases';

/**
 * Offline tier: scores the deterministic, pre-LLM pipeline (normalise → classify → extract →
 * tokenise) against the golden set. No network, no key, fully reproducible, so it runs on every PR.
 *
 * Why it matters: anything lost here never reaches Gemini, and no prompt can recover it.
 */

export interface Tally {
  passed: number;
  total: number;
}

export interface CaseResult {
  id: string;
  tokens: string[];
  productType: { expected: string; actual: string };
  missingTokens: string[];
  leakedText: string[];
  lostAllergens: string[];
  missedEdcs: string[];
}

export interface OfflineReport {
  metrics: {
    classificationAccuracy: Tally;
    tokenRecall: Tally;
    noiseRejection: Tally;
    allergenSurvival: Tally;
    edcDetection: Tally;
  };
  cases: CaseResult[];
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Every 1-3 word run inside each token, so "whey powder" still exposes "whey". */
const phrases = (tokens: string[]): string[] =>
  tokens.flatMap(token => {
    const words = token
      .replace(/[^\p{L}\p{N}' -]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const out: string[] = [];
    for (let n = 1; n <= 3; n++) {
      for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(' '));
    }
    return out;
  });

export const scoreCase = (golden: GoldenCase): CaseResult => {
  const { productType, tokens } = prepareLabel(golden.labelText);
  const haystack = tokens.map(norm);
  const contains = (needle: string) => haystack.some(t => t.includes(norm(needle)));
  const exposed = phrases(haystack);

  const allergensFound = new Set(exposed.map(p => checkAllergen(p)?.allergen).filter(Boolean));
  const edcsFound = new Set(
    exposed.map(p => checkEDC(p)?.ingredient.toLowerCase()).filter(Boolean),
  );

  return {
    id: golden.id,
    tokens,
    productType: { expected: golden.productType, actual: productType },
    missingTokens: golden.ingredients.map(i => i.token).filter(t => !contains(t)),
    leakedText: (golden.notIngredients ?? []).filter(contains),
    lostAllergens: (golden.allergens ?? []).filter(a => !allergensFound.has(a)),
    missedEdcs: (golden.edcs ?? []).filter(e => !edcsFound.has(e.toLowerCase())),
  };
};

export const scoreAll = (cases: GoldenCase[]): OfflineReport => {
  const results = cases.map(scoreCase);
  const tally = (pass: number, total: number): Tally => ({ passed: pass, total });
  const sum = (f: (c: GoldenCase, r: CaseResult) => [number, number]) =>
    cases.reduce<[number, number]>(
      (acc, c, i) => {
        const [p, t] = f(c, results[i]);
        return [acc[0] + p, acc[1] + t];
      },
      [0, 0],
    );

  const [clsP, clsT] = sum((_, r) => [r.productType.expected === r.productType.actual ? 1 : 0, 1]);
  const [tokP, tokT] = sum((c, r) => [
    c.ingredients.length - r.missingTokens.length,
    c.ingredients.length,
  ]);
  const [noiP, noiT] = sum((c, r) => {
    const n = c.notIngredients?.length ?? 0;
    return [n - r.leakedText.length, n];
  });
  const [algP, algT] = sum((c, r) => {
    const n = c.allergens?.length ?? 0;
    return [n - r.lostAllergens.length, n];
  });
  const [edcP, edcT] = sum((c, r) => {
    const n = c.edcs?.length ?? 0;
    return [n - r.missedEdcs.length, n];
  });

  return {
    metrics: {
      classificationAccuracy: tally(clsP, clsT),
      tokenRecall: tally(tokP, tokT),
      noiseRejection: tally(noiP, noiT),
      allergenSurvival: tally(algP, algT),
      edcDetection: tally(edcP, edcT),
    },
    cases: results,
  };
};

export const rate = ({ passed, total }: Tally) => (total === 0 ? 1 : passed / total);
