import { Ingredient, IngredientStatus } from '../types/product';
import { SNAPSHOT_SEGMENT } from '../styles/snapshotTheme';

export type OutlookTone = 'clear' | 'bright' | 'mixed' | 'shifting';

const STATUS_SCORE: Record<IngredientStatus, number> = {
  safe: 0,
  unknown: 0.6,
  warning: 1.4,
  avoid: 2.2,
};

function weightIngredient(i: Ingredient): number {
  let w = STATUS_SCORE[i.status] ?? 0;
  if (i.allergen_info.is_match) w += 1.8;
  if (i.risk_family) w += 0.9;
  return Math.min(w, 6);
}

function toneFromAvg(avg: number): OutlookTone {
  if (avg < 0.65) return 'clear';
  if (avg < 1.35) return 'bright';
  if (avg < 2.1) return 'mixed';
  return 'shifting';
}

function colorForLevel(level: number): { color: string; label: string } {
  if (level < 0.9) return { color: SNAPSHOT_SEGMENT.clear, label: 'light' };
  if (level < 1.6) return { color: SNAPSHOT_SEGMENT.light, label: 'soft' };
  if (level < 2.4) return { color: SNAPSHOT_SEGMENT.mist, label: 'mist' };
  return { color: SNAPSHOT_SEGMENT.warm, label: 'warm' };
}

export const OUTLOOK_COPY: Record<OutlookTone, string> = {
  clear: 'Skies look open — ingredients lean familiar.',
  bright: 'A few clouds worth peeking at — nothing stormy.',
  mixed: 'Patchy conditions — tap items you want to understand better.',
  shifting: 'Layers to explore — take it ingredient by ingredient.',
};

export function headlineForTone(tone: OutlookTone): string {
  switch (tone) {
    case 'clear':
      return 'Mostly clear';
    case 'bright':
      return 'Partly sunny';
    case 'mixed':
      return 'Mixed skies';
    default:
      return 'Shifting light';
  }
}

export function buildSegments(ingredients: Ingredient[]) {
  const n = ingredients.length;
  if (n === 0) {
    return {
      tone: 'clear' as OutlookTone,
      segments: Array.from({ length: 5 }, () => colorForLevel(0)),
      summaryLine: 'Scan your product to see how the day reads.',
    };
  }

  const buckets = 5;
  const per: number[] = Array.from({ length: buckets }, () => 0);
  const counts: number[] = Array.from({ length: buckets }, () => 0);

  ingredients.forEach((ing, idx) => {
    const b = Math.min(buckets - 1, Math.floor((idx / Math.max(n, 1)) * buckets));
    per[b] += weightIngredient(ing);
    counts[b] += 1;
  });

  const levels = per.map((sum, i) => (counts[i] ? sum / counts[i] : sum));
  const avg = levels.reduce((a, b) => a + b, 0) / buckets;
  const tone = toneFromAvg(avg);

  const segments = levels.map(lv => colorForLevel(lv));

  const softSummary = (() => {
    const allergens = ingredients.filter(i => i.allergen_info.is_match).length;
    const watch = ingredients.filter(i => i.status === 'warning' || i.status === 'avoid').length;
    if (allergens === 0 && watch === 0) {
      return `${n} ingredient${n === 1 ? '' : 's'} in the mix — overall reading is easygoing.`;
    }
    if (allergens > 0 && watch === 0) {
      return `${n} ingredients; ${allergens} allergen note${allergens === 1 ? '' : 's'} to keep on your radar.`;
    }
    return `${n} ingredients; ${watch} spot${watch === 1 ? '' : 's'} worth a closer look when you have time.`;
  })();

  return { tone, segments, summaryLine: softSummary };
}
