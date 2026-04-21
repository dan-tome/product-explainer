import { EDC_ENTRIES } from './edcData';

/**
 * Instant micro-literacy labels for the viewfinder Ghost Pill (barcode path).
 * Extend GTIN_MAP with your Open Food Facts / internal catalog joins.
 */
const PARABEN_MICRO =
  EDC_ENTRIES.find(e => e.family === 'Paraben')?.family ?? 'Paraben';

/** Exact GTIN / UPC strings (digits only) → display line for Ghost Pill */
export const GTIN_MICRO_LABELS: Record<string, string> = {
  // Demo canary — replace with real catalog rows
  '3600531428521': `${PARABEN_MICRO} preservative`,
  '30142356': `${PARABEN_MICRO} preservative`,
  /** Wipes pack EAN-8 — bundled test image `assets/test-barcode-wipes.png` */
  '08066282': 'Wipes pack — open slate for detail',
};

/**
 * Resolves Ghost Pill copy from raw barcode `data` synchronously (<1ms).
 * Falls back to family-style labels from edcData when GTIN prefix matches demo rules.
 */
export function ghostLabelFromBarcodeData(data: string): string {
  const digits = data.replace(/\D/g, '');
  if (digits.length === 0) {
    return 'Label link';
  }
  const exact = GTIN_MICRO_LABELS[digits];
  if (exact) return exact;

  // Demo prefix heuristic (Innovation stress-test): long EAN starting with 3600531 → paraben-class mass-market
  if (digits.length >= 8 && digits.startsWith('3600531')) {
    return `${PARABEN_MICRO} preservative`;
  }

  return 'Product link — open slate for detail';
}
