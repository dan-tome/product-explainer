# Gemini Ingredient Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static ingredients database with a Google Gemini API call that corrects OCR errors and classifies every ingredient with a health status and explanation.

**Architecture:** A new `geminiService.ts` wraps the Gemini API — it takes a list of raw ingredient strings and returns corrected names + classifications in one batched call. `analysisService.ts` keeps its text-parsing helpers but becomes async and delegates classification to `geminiService`. `results.tsx` gains a loading state to handle the async call. API key is stored in `.env.local` as `EXPO_PUBLIC_GEMINI_API_KEY`.

**Tech Stack:** `@google/generative-ai`, Expo SDK 54 bare workflow, React Native 0.81.5, TypeScript, jest-expo v55 + jest v29

---

## File Map

| File | Action |
|---|---|
| `src/services/geminiService.ts` | Create — Gemini API wrapper |
| `src/services/geminiService.test.ts` | Create — TDD tests for Gemini wrapper |
| `src/services/analysisService.ts` | Modify — make async, replace DB lookup with geminiService call |
| `src/services/analysisService.test.ts` | Modify — mock geminiService, rewrite lookup tests |
| `app/results.tsx` | Modify — useEffect + useState for async, loading spinner |
| `src/results.test.tsx` | Modify — mock analyzeIngredients as async, test loading state |
| `.env.local` | Create — EXPO_PUBLIC_GEMINI_API_KEY (already gitignored) |

---

### Task 1: Install SDK and set up API key

**Files:**
- Modify: `package.json` (via npm)
- Create: `.env.local`

- [ ] **Step 1: Install the Gemini SDK**

```bash
npm install @google/generative-ai --legacy-peer-deps
```

Expected: package added, no errors.

- [ ] **Step 2: Create .env.local**

Create `.env.local` at the project root:

```
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free API key from https://aistudio.google.com/app/apikey (Google account required, no credit card).

- [ ] **Step 3: Verify .gitignore covers .env.local**

```bash
grep "env" .gitignore
```

Expected output includes `.env*.local` — this means `.env.local` is already ignored. No changes needed.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @google/generative-ai SDK"
```

---

### Task 2: Write failing tests for geminiService, then implement

**Files:**
- Create: `src/services/geminiService.test.ts`
- Create: `src/services/geminiService.ts`

- [ ] **Step 1: Write the test file**

Create `src/services/geminiService.test.ts`:

```typescript
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(),
}));

import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeWithGemini } from './geminiService';

describe('analyzeWithGemini', () => {
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    mockGenerateContent = jest.fn();
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }));
  });

  it('returns empty array without calling Gemini when given no ingredients', async () => {
    const result = await analyzeWithGemini([]);
    expect(result).toEqual([]);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('includes all ingredients in the prompt', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => '[]' },
    });
    await analyzeWithGemini(['Salt', 'Sugar']);
    const prompt = mockGenerateContent.mock.calls[0][0];
    expect(prompt).toContain('Salt');
    expect(prompt).toContain('Sugar');
  });

  it('returns parsed IngredientAnalysis array from Gemini JSON', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '[{"name":"Potatoes","status":"safe","info":"A root vegetable, low in fat."}]',
      },
    });
    const result = await analyzeWithGemini(['Potatoes']);
    expect(result).toEqual([
      { name: 'Potatoes', status: 'safe', info: 'A root vegetable, low in fat.' },
    ]);
  });

  it('corrects OCR errors via Gemini response name field', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '[{"name":"Powdered dried parsley","status":"safe","info":"A herb."}]',
      },
    });
    const result = await analyzeWithGemini(['Pewde dried parsely']);
    expect(result[0].name).toBe('Powdered dried parsley');
  });

  it('falls back to unknown status for each ingredient when Gemini returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'not valid json at all' },
    });
    const result = await analyzeWithGemini(['Salt', 'Sugar']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Salt', status: 'unknown', info: 'Could not analyze this ingredient.' });
    expect(result[1]).toEqual({ name: 'Sugar', status: 'unknown', info: 'Could not analyze this ingredient.' });
  });

  it('falls back to unknown status for each ingredient when Gemini call throws', async () => {
    mockGenerateContent.mockRejectedValue(new Error('network error'));
    const result = await analyzeWithGemini(['Salt']);
    expect(result[0].status).toBe('unknown');
    expect(result[0].name).toBe('Salt');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/services/geminiService.test.ts --no-coverage
```

Expected: **FAIL** — `Cannot find module './geminiService'`

- [ ] **Step 3: Create the service**

Create `src/services/geminiService.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IngredientAnalysis } from './analysisService';

const PROMPT = `You are a food ingredient analyst. You will be given a list of ingredients parsed from a food label via OCR — they may contain OCR errors or misspellings.

For each ingredient:
1. Correct any obvious OCR errors or misspellings
2. Classify it as: safe, warning, avoid, or unknown
3. Provide a 1-2 sentence explanation

Respond with a JSON array only, no markdown:
[{"name": "corrected name", "status": "safe|warning|avoid|unknown", "info": "explanation"}, ...]

Ingredients:
`;

export const analyzeWithGemini = async (ingredients: string[]): Promise<IngredientAnalysis[]> => {
  if (ingredients.length === 0) return [];

  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    const result = await model.generateContent(PROMPT + ingredients.join('\n'));
    const parsed = JSON.parse(result.response.text());
    return parsed as IngredientAnalysis[];
  } catch {
    return ingredients.map(name => ({
      name,
      status: 'unknown' as const,
      info: 'Could not analyze this ingredient.',
    }));
  }
};
```

- [ ] **Step 4: Run the geminiService tests — all should pass**

```bash
npx jest src/services/geminiService.test.ts --no-coverage
```

Expected:
```
PASS src/services/geminiService.test.ts
  analyzeWithGemini
    ✓ returns empty array without calling Gemini when given no ingredients
    ✓ includes all ingredients in the prompt
    ✓ returns parsed IngredientAnalysis array from Gemini JSON
    ✓ corrects OCR errors via Gemini response name field
    ✓ falls back to unknown status for each ingredient when Gemini returns invalid JSON
    ✓ falls back to unknown status for each ingredient when Gemini call throws

Tests: 6 passed
```

- [ ] **Step 5: Commit**

```bash
git add src/services/geminiService.ts src/services/geminiService.test.ts
git commit -m "feat: add Gemini service for ingredient analysis and OCR correction"
```

---

### Task 3: Make analysisService async and wire in geminiService

**Files:**
- Modify: `src/services/analysisService.ts`
- Modify: `src/services/analysisService.test.ts`

- [ ] **Step 1: Rewrite analysisService.test.ts**

Replace the entire contents of `src/services/analysisService.test.ts`:

```typescript
jest.mock('./geminiService', () => ({
  analyzeWithGemini: jest.fn(),
}));

import { analyzeWithGemini } from './geminiService';
import { analyzeIngredients } from './analysisService';

const mockAnalyzeWithGemini = analyzeWithGemini as jest.Mock;

describe('analyzeIngredients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyzeWithGemini.mockResolvedValue([]);
  });

  it('returns empty array for empty string without calling Gemini', async () => {
    const result = await analyzeIngredients('');
    expect(result).toEqual([]);
    expect(mockAnalyzeWithGemini).not.toHaveBeenCalled();
  });

  it('extracts ingredient tokens from INGREDIENTS: section and passes them to Gemini', async () => {
    await analyzeIngredients('INGREDIENTS: Water, Salt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['water', 'salt']);
  });

  it('returns the results from Gemini', async () => {
    mockAnalyzeWithGemini.mockResolvedValue([
      { name: 'Water', status: 'safe', info: 'Essential for life.' },
    ]);
    const result = await analyzeIngredients('INGREDIENTS: Water');
    expect(result).toEqual([{ name: 'Water', status: 'safe', info: 'Essential for life.' }]);
  });

  it('strips parenthetical sub-ingredients before passing to Gemini', async () => {
    await analyzeIngredients('INGREDIENTS: Vegetable Oils (Sunflower, Rapeseed), Salt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['vegetable oils', 'salt']);
  });

  it('normalises pipe separators before passing to Gemini', async () => {
    await analyzeIngredients('INGREDIENTS: Potatoes | Salt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['potatoes', 'salt']);
  });

  it('normalises newline separators before passing to Gemini', async () => {
    await analyzeIngredients('INGREDIENTS: Potatoes\nSalt');
    expect(mockAnalyzeWithGemini).toHaveBeenCalledWith(['potatoes', 'salt']);
  });

  it('filters tokens shorter than 4 chars or not starting with two letters', async () => {
    await analyzeIngredients('INGREDIENTS: Water, 150g Sugar, Ab, Salt');
    const called = mockAnalyzeWithGemini.mock.calls[0][0];
    expect(called).toContain('water');
    expect(called).toContain('salt');
    expect(called).not.toContain('150g sugar');
    expect(called).not.toContain('ab');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/services/analysisService.test.ts --no-coverage
```

Expected: most tests **FAIL** — `analyzeIngredients` is still synchronous and calls the DB.

- [ ] **Step 3: Rewrite analysisService.ts**

Replace the entire contents of `src/services/analysisService.ts`:

```typescript
import { analyzeWithGemini } from './geminiService';

export type IngredientStatus = 'safe' | 'warning' | 'avoid' | 'unknown';

export interface IngredientAnalysis {
  name: string;
  status: IngredientStatus;
  info: string;
}

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

export const analyzeIngredients = async (text: string): Promise<IngredientAnalysis[]> => {
  if (!text) return [];

  const section = extractIngredientsSection(text);
  const ingredients = normalizeText(section)
    .split(',')
    .map(i => i.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter(i => i.length > 3 && /^[a-zA-Z]{2}/i.test(i));

  if (ingredients.length === 0) return [];

  return analyzeWithGemini(ingredients);
};
```

- [ ] **Step 4: Run analysisService tests — all 7 should pass**

```bash
npx jest src/services/analysisService.test.ts --no-coverage
```

Expected:
```
PASS src/services/analysisService.test.ts
  analyzeIngredients
    ✓ returns empty array for empty string without calling Gemini
    ✓ extracts ingredient tokens from INGREDIENTS: section and passes them to Gemini
    ✓ returns the results from Gemini
    ✓ strips parenthetical sub-ingredients before passing to Gemini
    ✓ normalises pipe separators before passing to Gemini
    ✓ normalises newline separators before passing to Gemini
    ✓ filters tokens shorter than 4 chars or not starting with two letters

Tests: 7 passed
```

- [ ] **Step 5: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: geminiService (6) + analysisService (7) + ocrService (5) + imageProcessingService (5) + IngredientCard (4) pass. results.test.tsx will **FAIL** — that is expected and fixed in Task 4.

- [ ] **Step 6: Commit**

```bash
git add src/services/analysisService.ts src/services/analysisService.test.ts
git commit -m "feat: make analyzeIngredients async, delegate to Gemini service"
```

---

### Task 4: Update results.tsx and results.test.tsx for async

**Files:**
- Modify: `app/results.tsx`
- Modify: `src/results.test.tsx`

- [ ] **Step 1: Rewrite results.test.tsx**

Replace the entire contents of `src/results.test.tsx`:

```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: () => null },
}));

jest.mock('../src/services/analysisService', () => ({
  analyzeIngredients: jest.fn(),
}));

import { useLocalSearchParams } from 'expo-router';
import { analyzeIngredients } from '../src/services/analysisService';

const mockParams = useLocalSearchParams as jest.Mock;
const mockAnalyze = analyzeIngredients as jest.Mock;

import ResultsScreen from '../app/results';

const MOCK_RESULTS = [
  { name: 'Water', status: 'safe' as const, info: 'Essential.' },
  { name: 'Sugar', status: 'avoid' as const, info: 'High sugar.' },
  { name: 'Maltodextrin', status: 'warning' as const, info: 'Processed starch.' },
  { name: 'Palm Oil', status: 'warning' as const, info: 'Environmental concerns.' },
  { name: 'Salt', status: 'warning' as const, info: 'High intake risk.' },
  { name: 'Citric Acid', status: 'safe' as const, info: 'Natural preservative.' },
  { name: 'Soy Lecithin', status: 'safe' as const, info: 'Emulsifier.' },
];

describe('ResultsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ text: 'Water, Sugar, Maltodextrin, Palm Oil, Salt, Citric Acid, Soy Lecithin' });
    mockAnalyze.mockResolvedValue(MOCK_RESULTS);
  });

  it('shows a loading indicator before analysis completes', () => {
    mockAnalyze.mockReturnValue(new Promise(() => {}));
    render(<ResultsScreen />);
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders without crashing after loading', async () => {
    render(<ResultsScreen />);
    await waitFor(() => expect(screen.queryByTestId('loading-indicator')).toBeNull());
  });

  it('shows the correct total ingredient count after loading', async () => {
    render(<ResultsScreen />);
    await waitFor(() => expect(screen.getByText('7')).toBeTruthy());
  });

  it('renders an ingredient card for each ingredient', async () => {
    render(<ResultsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Water')).toBeTruthy();
      expect(screen.getByText('Sugar')).toBeTruthy();
      expect(screen.getByText('Maltodextrin')).toBeTruthy();
    });
  });

  it('shows empty state when analysis returns no ingredients', async () => {
    mockAnalyze.mockResolvedValue([]);
    render(<ResultsScreen />);
    await waitFor(() =>
      expect(screen.getByText('No ingredients found to analyze.')).toBeTruthy()
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/results.test.tsx --no-coverage
```

Expected: **FAIL** — `analyzeIngredients` is now async but `results.tsx` still uses `useMemo`.

- [ ] **Step 3: Rewrite results.tsx**

Replace the entire contents of `app/results.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { analyzeIngredients, IngredientAnalysis } from '../src/services/analysisService';
import { IngredientCard } from '../src/components/IngredientCard';

export default function ResultsScreen() {
  const { text } = useLocalSearchParams<{ text: string }>();
  const [ingredients, setIngredients] = useState<IngredientAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeIngredients(text || '').then(result => {
      setIngredients(result);
      setLoading(false);
    });
  }, [text]);

  const stats = {
    total: ingredients.length,
    safe: ingredients.filter(i => i.status === 'safe').length,
    warning: ingredients.filter(i => i.status === 'warning').length,
    avoid: ingredients.filter(i => i.status === 'avoid').length,
    unknown: ingredients.filter(i => i.status === 'unknown').length,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Analysis Results' }} />
        <ActivityIndicator testID="loading-indicator" size="large" color="#f4511e" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Analysis Results' }} />

      <View style={styles.summaryContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#4caf50', borderTopWidth: 4 }]}>
          <Text style={styles.statLabel}>Safe</Text>
          <Text style={styles.statValue}>{stats.safe}</Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#ff9800', borderTopWidth: 4 }]}>
          <Text style={styles.statLabel}>Warning</Text>
          <Text style={styles.statValue}>{stats.warning}</Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#f44336', borderTopWidth: 4 }]}>
          <Text style={styles.statLabel}>Avoid</Text>
          <Text style={styles.statValue}>{stats.avoid}</Text>
        </View>
      </View>

      <FlatList
        data={ingredients}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={({ item }) => <IngredientCard ingredient={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ingredients found to analyze.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statBox: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    minWidth: 70,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
```

- [ ] **Step 4: Run results tests — all 5 should pass**

```bash
npx jest src/results.test.tsx --no-coverage
```

Expected:
```
PASS src/results.test.tsx
  ResultsScreen
    ✓ shows a loading indicator before analysis completes
    ✓ renders without crashing after loading
    ✓ shows the correct total ingredient count after loading
    ✓ renders an ingredient card for each ingredient
    ✓ shows empty state when analysis returns no ingredients

Tests: 5 passed
```

- [ ] **Step 5: Run full test suite — all pass**

```bash
npx jest --no-coverage
```

Expected: 33 tests pass (6 + 7 + 5 + 5 + 4 + 5 + 1 = wait, let me recount):
- geminiService: 6
- analysisService: 7
- ocrService: 5
- imageProcessingService: 5
- IngredientCard: 4
- results: 5

Total: **32 tests, all passing**.

- [ ] **Step 6: Commit**

```bash
git add app/results.tsx src/results.test.tsx
git commit -m "feat: add loading state to ResultsScreen for async Gemini analysis"
```

---

## Self-Review

**Spec coverage:**
- ✅ Install `@google/generative-ai` — Task 1
- ✅ `geminiService.ts` — single batched Gemini call — Task 2
- ✅ OCR error correction via Gemini `name` field — Task 2
- ✅ `safe|warning|avoid|unknown` classification — Task 2
- ✅ 1-2 sentence explanation in `info` — Task 2 (prompt design)
- ✅ `analyzeIngredients` made async — Task 3
- ✅ Text parsing helpers preserved — Task 3
- ✅ Results screen loading state — Task 4
- ✅ `EXPO_PUBLIC_GEMINI_API_KEY` env var — Task 1 + Task 2 (service reads it)
- ✅ `.env.local` gitignored — Task 1 (verified existing .gitignore)
- ✅ TDD throughout — tests written and confirmed failing before each implementation

**No placeholders. No TODOs.**

**Type consistency:** `IngredientAnalysis` defined in `analysisService.ts`, imported by `geminiService.ts`. `analyzeWithGemini(ingredients: string[]): Promise<IngredientAnalysis[]>` used consistently in Tasks 2, 3. `analyzeIngredients(text: string): Promise<IngredientAnalysis[]>` used consistently in Tasks 3, 4.
