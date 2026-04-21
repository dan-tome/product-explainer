import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient } from '../types/product';
import { checkEDC } from './edcService';

const STORAGE_KEY = '@healthscan/routine-v1';

export interface ScannedProduct {
  id: string;
  label: string;
  ingredients: Ingredient[];
  scannedAt: number;
}

export interface CompoundExposure {
  key: string;           // scientific_name (lowercase) — stable deduplication key
  commonName: string;
  family: 'EDC' | 'Allergen';
  concern: string;
  occurrences: number;   // number of products in the routine containing this ingredient
  products: string[];    // product labels for display
}

// productId → label, maintained per index entry.
// Using Map<productId, label> avoids duplicates when the same product is re-added.
interface IndexEntry {
  commonName: string;
  family: 'EDC' | 'Allergen';
  concern: string;
  productMap: Map<string, string>; // productId → productLabel
}

// ── Module-level state ────────────────────────────────────────────────────────
// Client-side only. No persistence, no network. Cleared on app restart.

const _products = new Map<string, ScannedProduct>();

// Eagerly-maintained compound index.
// Built incrementally at addScan time → getCompoundExposures() is O(k),
// where k = unique flagged ingredient keys (EDC + allergen), not O(p × n).
const _index = new Map<string, IndexEntry>();

// ── Persistence ───────────────────────────────────────────────────────────────

// Serialises _products to AsyncStorage. Fire-and-forget — never blocks callers.
const persist = (): void => {
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(Array.from(_products.entries())),
  ).catch(() => {}); // non-fatal: in-memory state remains the source of truth
};

// ── Private helpers ───────────────────────────────────────────────────────────

const upsertIndex = (
  key: string,
  commonName: string,
  family: 'EDC' | 'Allergen',
  concern: string,
  productId: string,
  productLabel: string,
): void => {
  const existing = _index.get(key);
  if (existing) {
    existing.productMap.set(productId, productLabel);
  } else {
    _index.set(key, {
      commonName,
      family,
      concern,
      productMap: new Map([[productId, productLabel]]),
    });
  }
};

const indexIngredients = (product: ScannedProduct): void => {
  for (const ingredient of product.ingredients) {
    const key = ingredient.scientific_name.toLowerCase().trim();

    // EDC check — O(1) Map lookup via checkEDC
    const edcMatch = checkEDC(ingredient.scientific_name) ?? checkEDC(ingredient.common_name);
    if (edcMatch !== null) {
      upsertIndex(
        key,
        ingredient.common_name,
        'EDC',
        edcMatch.concern,
        product.id,
        product.label,
      );
      continue; // EDC takes precedence; skip allergen check for same ingredient
    }

    // Allergen check — already resolved by analysisService; O(1) field read
    if (ingredient.allergen_info.is_match && ingredient.allergen_info.alias_detected) {
      upsertIndex(
        key,
        ingredient.common_name,
        'Allergen',
        `Contains ${ingredient.allergen_info.alias_detected} — a known allergen.`,
        product.id,
        product.label,
      );
    }
  }
};

const deindexProduct = (productId: string): void => {
  for (const [key, entry] of _index) {
    entry.productMap.delete(productId);
    if (entry.productMap.size === 0) {
      _index.delete(key);
    }
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Adds a scanned product to the routine.
 * Re-adding the same id overwrites the previous scan for that product.
 * O(n) where n = ingredient count of the new product.
 */
export const addScan = (id: string, label: string, ingredients: Ingredient[]): void => {
  // If this product was previously scanned, remove its old index entries first.
  if (_products.has(id)) {
    deindexProduct(id);
  }
  const product: ScannedProduct = { id, label, ingredients, scannedAt: Date.now() };
  _products.set(id, product);
  indexIngredients(product);
  persist();
};

/**
 * Removes a product from the routine and cleans up its index entries.
 * O(k) where k = unique flagged ingredient count.
 */
export const removeScan = (id: string): void => {
  if (!_products.has(id)) return;
  _products.delete(id);
  deindexProduct(id);
  persist();
};

/**
 * Returns ingredients (EDC or allergen) found in two or more products.
 * O(k) where k = unique flagged ingredients in the index.
 * Well within the 200ms Heartbeat budget for any realistic routine size.
 */
export const getCompoundExposures = (minOccurrences = 2): CompoundExposure[] => {
  const results: CompoundExposure[] = [];
  for (const [key, entry] of _index) {
    if (entry.productMap.size >= minOccurrences) {
      results.push({
        key,
        commonName: entry.commonName,
        family: entry.family,
        concern: entry.concern,
        occurrences: entry.productMap.size,
        products: Array.from(entry.productMap.values()),
      });
    }
  }
  return results.sort((a, b) => b.occurrences - a.occurrences);
};

/**
 * Returns all products currently in the routine, sorted oldest-first.
 */
export const getScannedProducts = (): ScannedProduct[] =>
  Array.from(_products.values()).sort((a, b) => a.scannedAt - b.scannedAt);

/**
 * High-level summary for the ProductPulse or a future RoutineDashboard.
 */
export const getRoutineSummary = () => ({
  totalProducts: _products.size,
  compoundExposures: getCompoundExposures(),
  edcCount: [..._index.values()].filter(e => e.family === 'EDC' && e.productMap.size >= 2).length,
  allergenCount: [..._index.values()].filter(e => e.family === 'Allergen' && e.productMap.size >= 2).length,
});

/**
 * Clears the entire in-memory routine. No side effects beyond local state.
 */
export const clearRoutine = (): void => {
  _products.clear();
  _index.clear();
  _hydrated = false; // allow loadRoutine to re-run after a clear (storage is also being wiped)
  persist();
};

/**
 * Hydrates the in-memory routine from AsyncStorage.
 * Call once on app mount (e.g. from the root layout's useEffect).
 * Safe to call multiple times — subsequent calls are no-ops if already loaded.
 */
let _hydrated = false;
export const loadRoutine = async (): Promise<void> => {
  if (_hydrated) return;
  _hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries: [string, ScannedProduct][] = JSON.parse(raw);
    for (const [id, product] of entries) {
      _products.set(id, product);
      indexIngredients(product);
    }
  } catch {
    // Storage read failure is non-fatal — start with a clean in-memory state
  }
};
