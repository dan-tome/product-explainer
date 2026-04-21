# Image Pre-processing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract image pre-processing into a testable service that crops to the scan area, increases resolution to 1500px, and saves as lossless PNG to improve ML Kit OCR accuracy.

**Architecture:** Create `src/services/imageProcessingService.ts` with a single `preprocessImageForOCR(uri, photoDimensions)` function. The scan area shown in the UI is 80% wide × 40% tall and centered — these proportions are used to crop the photo before resizing. Wire it into `app/index.tsx` replacing the existing inline manipulator call.

**Tech Stack:** `expo-image-manipulator` (already installed), Jest (mock), TypeScript

---

## File Map

| File | Action |
|---|---|
| `src/services/imageProcessingService.ts` | Create — crop + resize + PNG logic |
| `src/services/imageProcessingService.test.ts` | Create — TDD tests written before implementation |
| `app/index.tsx` | Modify — replace inline ImageManipulator call with new service |

---

### Task 1: Write failing tests for the image processing service

**Files:**
- Create: `src/services/imageProcessingService.test.ts`

- [ ] **Step 1: Write the test file**

Create `src/services/imageProcessingService.test.ts`:

```typescript
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { PNG: 'png', JPEG: 'jpg' },
}));

import * as ImageManipulator from 'expo-image-manipulator';
import { preprocessImageForOCR } from './imageProcessingService';

const mockManipulate = ImageManipulator.manipulateAsync as jest.Mock;
const PHOTO = { width: 3000, height: 4000 };

describe('preprocessImageForOCR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManipulate.mockResolvedValue({ uri: 'file:///processed.png' });
  });

  it('crops to center 80% wide × 40% tall of the photo', async () => {
    await preprocessImageForOCR('file:///original.jpg', PHOTO);
    const actions = mockManipulate.mock.calls[0][1];
    expect(actions[0]).toEqual({
      crop: { originX: 300, originY: 1200, width: 2400, height: 1600 },
    });
  });

  it('resizes to 1500px wide after crop', async () => {
    await preprocessImageForOCR('file:///original.jpg', PHOTO);
    const actions = mockManipulate.mock.calls[0][1];
    expect(actions[1]).toEqual({ resize: { width: 1500 } });
  });

  it('saves as PNG with full quality', async () => {
    await preprocessImageForOCR('file:///original.jpg', PHOTO);
    const options = mockManipulate.mock.calls[0][2];
    expect(options.format).toBe('png');
    expect(options.compress).toBe(1);
  });

  it('passes the original URI to manipulateAsync', async () => {
    await preprocessImageForOCR('file:///original.jpg', PHOTO);
    expect(mockManipulate.mock.calls[0][0]).toBe('file:///original.jpg');
  });

  it('returns the processed image URI', async () => {
    const uri = await preprocessImageForOCR('file:///original.jpg', PHOTO);
    expect(uri).toBe('file:///processed.png');
  });
});
```

Crop math for 3000×4000 photo:
- cropWidth = 3000 × 0.8 = 2400, originX = (3000 − 2400) / 2 = 300
- cropHeight = 4000 × 0.4 = 1600, originY = (4000 − 1600) / 2 = 1200

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/services/imageProcessingService.test.ts --no-coverage
```

Expected: **FAIL** — `Cannot find module './imageProcessingService'`

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/services/imageProcessingService.test.ts
git commit -m "test: add failing tests for image preprocessing service"
```

---

### Task 2: Implement the image processing service

**Files:**
- Create: `src/services/imageProcessingService.ts`

- [ ] **Step 1: Create the service file**

Create `src/services/imageProcessingService.ts`:

```typescript
import * as ImageManipulator from 'expo-image-manipulator';

export const preprocessImageForOCR = async (
  uri: string,
  photoDimensions: { width: number; height: number }
): Promise<string> => {
  const { width, height } = photoDimensions;
  const cropWidth = Math.round(width * 0.8);
  const cropHeight = Math.round(height * 0.4);
  const originX = Math.round((width - cropWidth) / 2);
  const originY = Math.round((height - cropHeight) / 2);

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      { crop: { originX, originY, width: cropWidth, height: cropHeight } },
      { resize: { width: 1500 } },
    ],
    { compress: 1, format: ImageManipulator.SaveFormat.PNG }
  );

  return result.uri;
};
```

- [ ] **Step 2: Run the service tests — all should pass**

```bash
npx jest src/services/imageProcessingService.test.ts --no-coverage
```

Expected:
```
PASS src/services/imageProcessingService.test.ts
  preprocessImageForOCR
    ✓ crops to center 80% wide × 40% tall of the photo
    ✓ resizes to 1500px wide after crop
    ✓ saves as PNG with full quality
    ✓ passes the original URI to manipulateAsync
    ✓ returns the processed image URI

Tests: 5 passed
```

- [ ] **Step 3: Run full test suite — no regressions**

```bash
npx jest --no-coverage
```

Expected: all 22 previously passing tests still pass (22 + 5 new = 27 total).

- [ ] **Step 4: Commit**

```bash
git add src/services/imageProcessingService.ts
git commit -m "feat: extract image preprocessing service with crop + resize + PNG"
```

---

### Task 3: Wire the new service into the camera screen

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Replace the inline manipulator call**

In `app/index.tsx`, replace the import and the preprocessing block.

Remove this import (if it becomes unused):
```typescript
import * as ImageManipulator from 'expo-image-manipulator';
```

Add this import:
```typescript
import { preprocessImageForOCR } from '../src/services/imageProcessingService';
```

Replace this block inside `takePicture`:
```typescript
// Pre-process image to optimize for OCR
const manipulatedImage = await ImageManipulator.manipulateAsync(
  photo.uri,
  [{ resize: { width: 1000 } }],
  { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
);

// Perform OCR
const result = await extractTextFromImage(manipulatedImage.uri);
```

With:
```typescript
const processedUri = await preprocessImageForOCR(photo.uri, {
  width: photo.width,
  height: photo.height,
});
const result = await extractTextFromImage(processedUri);
```

- [ ] **Step 2: Run full test suite — no regressions**

```bash
npx jest --no-coverage
```

Expected: 27 tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "feat: wire image preprocessing service into camera screen"
```

---

## Self-Review

**Spec coverage:**
- ✅ Crop to center 80% wide × 40% tall — Task 1 + 2
- ✅ Resize to 1500px wide — Task 1 + 2
- ✅ PNG lossless format — Task 1 + 2
- ✅ Extracted into testable service — Task 2
- ✅ Wired into camera screen — Task 3
- ✅ TDD: tests written and confirmed failing before implementation — Task 1 before Task 2

**No placeholders. No TODOs.**

**Type consistency:** `preprocessImageForOCR(uri: string, photoDimensions: { width: number; height: number }): Promise<string>` used consistently across Tasks 1, 2, 3.
