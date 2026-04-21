# Ingredient Parser Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the ingredient parser so that parenthetical sub-ingredients are stripped before splitting, OCR noise characters (`|`, newlines) are normalised, and only tokens starting with a letter are kept.

**Architecture:** All changes are in `src/services/analysisService.ts`. Two new private helpers — `removeParentheticals` and `normalizeText` — are inserted between the existing `extractIngredientsSection` and the `analyzeIngredients` split logic. The public `analyzeIngredients` signature and `OCRResult`/`IngredientAnalysis` interfaces are unchanged.

**Tech Stack:** TypeScript, Jest (jest-expo v55 + jest v29)

---

## File Map

| File | Action |
|---|---|
| `src/services/analysisService.ts` | Modify — add `removeParentheticals`, `normalizeText`; update filter in `analyzeIngredients` |
| `src/services/analysisService.test.ts` | Modify — add tests for new parsing behaviour before implementing |

---

### Task 1: Write failing tests for the new parser behaviour

**Files:**
- Modify: `src/services/analysisService.test.ts`

- [ ] **Step 1: Add the new tests**

Append these tests to `src/services/analysisService.test.ts` (keep all existing tests):

```typescript
describe('analyzeIngredients — parser improvements', () => {
  it('strips parenthetical sub-ingredients before splitting', () => {
    const text = 'INGREDIENTS: Vegetable Oils (Sunflower, Rapeseed), Salt, Citric Acid';
    const results = analyzeIngredients(text);
    const names = results.map(r => r.name);
    expect(names).toContain('vegetable oils');
    expect(names).toContain('salt');
    expect(names).toContain('citric acid');
    expect(names.some(n => n.includes('sunflower'))).toBe(false);
    expect(names.some(n => n.includes('rapeseed'))).toBe(false);
  });

  it('strips nested parentheticals', () => {
    const text = 'INGREDIENTS: Colour (Paprika Extract (contains Citric Acid)), Salt';
    const results = analyzeIngredients(text);
    const names = results.map(r => r.name);
    expect(names).toContain('colour');
    expect(names).toContain('salt');
    expect(names.some(n => n.includes('paprika extract'))).toBe(false);
  });

  it('strips square-bracket sub-ingredients', () => {
    const text = 'INGREDIENTS: Seasoning [Sugar, Garlic], Water';
    const results = analyzeIngredients(text);
    const names = results.map(r => r.name);
    expect(names).toContain('seasoning');
    expect(names).toContain('water');
    expect(names.some(n => n.includes('sugar') || n.includes('garlic'))).toBe(false);
  });

  it('normalises pipe characters to comma separators', () => {
    const text = 'INGREDIENTS: Potatoes | Salt | Citric Acid';
    const results = analyzeIngredients(text);
    expect(results).toHaveLength(3);
  });

  it('normalises newlines to comma separators', () => {
    const text = 'INGREDIENTS: Potatoes\nSalt\nCitric Acid';
    const results = analyzeIngredients(text);
    expect(results).toHaveLength(3);
  });

  it('filters out tokens that do not start with a letter', () => {
    const text = 'INGREDIENTS: Water, 150g Sugar, Salt';
    const results = analyzeIngredients(text);
    const names = results.map(r => r.name);
    expect(names).not.toContain('150g sugar');
    expect(names).toContain('water');
    expect(names).toContain('salt');
  });
});
```

- [ ] **Step 2: Run tests to confirm the new ones fail**

```bash
npx jest src/services/analysisService.test.ts --no-coverage
```

Expected: existing 8 tests pass, new 6 tests **FAIL**.

- [ ] **Step 3: Commit failing tests**

```bash
git add src/services/analysisService.test.ts
git commit -m "test: add failing tests for improved ingredient parser"
```

---

### Task 2: Implement the parser improvements

**Files:**
- Modify: `src/services/analysisService.ts`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/services/analysisService.ts` with:

```typescript
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
```

- [ ] **Step 2: Run the analysis service tests — all 14 should pass**

```bash
npx jest src/services/analysisService.test.ts --no-coverage
```

Expected:
```
PASS src/services/analysisService.test.ts
  analyzeIngredients
    ✓ returns empty array for empty string
    ✓ identifies a known safe ingredient
    ✓ identifies a known avoid ingredient
    ✓ identifies a known warning ingredient
    ✓ marks unknown ingredients as unknown
    ✓ splits a comma-separated ingredient list
    ✓ returns correct statuses for a realistic label scan
    ✓ is case-insensitive
  analyzeIngredients — parser improvements
    ✓ strips parenthetical sub-ingredients before splitting
    ✓ strips nested parentheticals
    ✓ strips square-bracket sub-ingredients
    ✓ normalises pipe characters to comma separators
    ✓ normalises newlines to comma separators
    ✓ filters out tokens that do not start with a letter

Tests: 14 passed
```

- [ ] **Step 3: Run full test suite — no regressions**

```bash
npx jest --no-coverage
```

Expected: all previously passing tests still pass (27 + 6 new = 33 total).

- [ ] **Step 4: Commit**

```bash
git add src/services/analysisService.ts
git commit -m "feat: improve ingredient parser — strip parentheticals, normalise OCR noise"
```

---

## Self-Review

**Spec coverage:**
- ✅ Strip parenthetical sub-ingredients — `removeParentheticals` helper, Task 1 + 2
- ✅ Strip nested parentheticals (iterative removal) — `removeParentheticals` while loop, Task 1 + 2
- ✅ Strip square-bracket groups — `removeParentheticals` regex, Task 1 + 2
- ✅ Normalise `|` to comma — `normalizeText`, Task 1 + 2
- ✅ Normalise newlines to comma — `normalizeText`, Task 1 + 2
- ✅ Filter non-letter-start tokens — `/^[a-z]/i.test(i)` filter, Task 1 + 2
- ✅ `extractIngredientsSection` unchanged — preserved verbatim
- ✅ TDD: failing tests committed before implementation — Task 1 before Task 2

**No placeholders. No TODOs.**

**Type consistency:** `analyzeIngredients`, `IngredientAnalysis`, `IngredientStatus` used consistently throughout.
