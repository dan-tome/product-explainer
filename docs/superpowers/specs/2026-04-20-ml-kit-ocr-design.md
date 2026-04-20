# ML Kit OCR Integration Design

**Date:** 2026-04-20
**Status:** Approved

## Goal

Replace the stub in `src/services/ocrService.ts` with a real OCR implementation using Google ML Kit on-device text recognition. The existing `OCRResult` interface and function signature must remain unchanged so no callers need updating.

## Package

`@react-native-ml-kit/text-recognition` — React Native wrapper for Google ML Kit's on-device text recognition. Free, no API key required, works with bare Expo workflow.

## Data Flow

```
CameraScreen
    │  imageUri (JPEG, pre-processed by expo-image-manipulator)
    ▼
ocrService.extractTextFromImage(uri)
    │
    ▼
TextRecognition.recognize(uri)   ← @react-native-ml-kit/text-recognition
    │  { text: string, blocks: Block[] }
    ▼
OCRResult { text: string, confidence: number }
    │
    ▼
ResultsScreen (no changes required)
```

## Implementation

### `src/services/ocrService.ts`

- Import `TextRecognition` from `@react-native-ml-kit/text-recognition`
- Call `TextRecognition.recognize(imageUri)`
- Return `{ text: result.text, confidence: 1.0 }`
- ML Kit's `.text` property is the full recognized string with blocks joined by newlines
- Confidence is fixed at `1.0` — ML Kit text recognition does not expose a single aggregate confidence score

### Error Handling

| Case | Behaviour |
|---|---|
| ML Kit throws (corrupt image, native error) | Catch, rethrow as `Error('OCR failed: <message>')` — caller (`CameraScreen`) already has a try/catch that logs errors; a future improvement can surface an alert there |
| ML Kit returns empty text | Return `{ text: '', confidence: 1.0 }` — `ResultsScreen` already handles the empty state |

## Testing

Tests written before implementation (TDD). All ML Kit calls mocked at the module level.

| Test | Assertion |
|---|---|
| Happy path | `extractTextFromImage` calls `TextRecognition.recognize` with the URI and returns its `.text` |
| Empty result | When ML Kit returns `{ text: '' }`, service returns `{ text: '', confidence: 1.0 }` |
| Error case | When ML Kit throws, service rethrows with a prefixed message |

## Files Changed

| File | Change |
|---|---|
| `src/services/ocrService.ts` | Replace stub with ML Kit implementation |
| `src/services/ocrService.test.ts` | New — TDD tests written first |
| `package.json` | Add `@react-native-ml-kit/text-recognition` dependency |
| `android/app/build.gradle` | No changes needed — ML Kit is pulled in automatically via autolinking |

## Out of Scope

- Cloud Vision API fallback
- Per-block confidence scoring
- Real-time (frame processor) scanning
- iOS implementation (Android only for now)
