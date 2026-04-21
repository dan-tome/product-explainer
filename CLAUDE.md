HealthScan (Product Explainer) — Development Guide

## 1. Project Vision & Mission

**The Aim:** Democratize chemical literacy.

**The Villain:** Confusion and jargon on product labels.

**The Hero Moment:** Turning a scientific term into human understanding (e.g., "Tocopherol" → "Vitamin E").

**Verticals:** Food & Beverage, Cosmetics & Personal Care, Household Products.

---

## 2. Technical Stack & Standards

**Framework:** React Native 0.83.6 + Expo (SDK 55, bare workflow).

**Camera/Vision:**
- `expo-camera` — live viewfinder, shutter capture, and real-time barcode scanning (`ean13`, `ean8`, `upc_a`, `upc_e`, `qr`)
- `@react-native-ml-kit/text-recognition` — on-device OCR (ML Kit)
- `expo-image-manipulator` — image preprocessing before OCR

**AI Brain:** Gemini 2.5 Flash (`gemini-2.5-flash`) via `@google/generative-ai` SDK — ingredient correction, plain English analysis, full `Ingredient` object generation.

**Routing:** Expo Router (file-based, screens in `app/`).

**Code Style:**
- Strict TypeScript only.
- Functional components with Hooks.
- Services in `src/services/`, UI components in `src/components/`, screens in `app/`, types in `src/types/`, static data in `src/data/`.

**UI/UX Constraints:**
- NO Red/Green traffic lights. Use the "Research Palette" defined in `src/styles/Theme.ts` (Blues, Purples, Teals).
- Status values are `safe | warning | avoid | unknown` — map these to palette colors via `STATUS_COLOR` in Theme, never to red/green.
- Motion constants (durations, easing curves) live in `src/styles/motion.ts` — do not hardcode animation values inline.

---

## 3. Data Schema

The canonical ingredient model is `Ingredient`, defined in `src/types/product.ts`:

```ts
interface Ingredient {
  scientific_name: string;       // INCI / chemical name (e.g. "Tocopherol")
  common_name: string;           // plain English name (e.g. "Vitamin E")
  functional_purpose: string;    // "[Benefit] - [Scientific Action]"
  regulatory_context: string;    // regulatory status / jurisdiction notes
  exposure_context: string;      // usage guardrail; required for CORROSIVE/IRRITANT/SENSITIZER
  science_note: string;          // one-sentence mechanism / chemistry explanation
  literacy_flag: string;         // educational "did you know" takeaway
  risk_family: 'CORROSIVE' | 'IRRITANT' | 'SENSITIZER' | null;
  status: 'safe' | 'warning' | 'avoid' | 'unknown';
  is_ai_generated: boolean;
  allergen_info: AllergenInfo;   // appended post-Gemini by allergenService
}
```

Supporting types also in `src/types/product.ts`: `ProductType`, `IngredientStatus`, `RiskFamily`, `AllergenInfo`, `AllergenMatch`.

UI bridge types in `src/types/universalBridge.ts`: `ValidatedFamilySignal`, `CumulativeResearchNote`, `AggregateBridgeResult`.

Viewfinder state machine in `src/types/viewfinder.ts`: `'passive_search' | 'barcode_lock' | 'ocr_synthesis' | 'handoff'`.

---

## 4. Current Pipeline (as built)

```
Camera (expo-camera)
  ├── Barcode path: real-time scan → barcode_lock state → ghost pill label (gtinMicroLiteracy)
  └── OCR path:
        ↓
      takePictureAsync (quality 0.8)
        ↓
      preprocessImageForOCR          src/services/imageProcessingService.ts
        (center 80×40% crop, upscale to 1500px)
        ↓
      extractTextFromImage            src/services/ocrService.ts (ML Kit)
        ↓
      BridgeHandoff interstitial      src/components/UniversalOcrBridge.tsx
        ↓
      applyInciSynonymsToLabelText    src/services/inciNormalization.ts
        (Latin/French INCI synonyms → English before tokenization)
        ↓
      classifyProductText             src/services/classifierService.ts
        (FOOD / COSMETIC / HOUSEHOLD / UNKNOWN)
        ↓
      extractIngredientsSection + normalizeText
        (keyword extraction, parenthetical stripping)
        ↓
      analyzeWithGemini(tokens, productType)   src/services/geminiService.ts
        (returns Ingredient[] with all 11 fields)
        ↓
      checkAllergen per ingredient    src/services/allergenService.ts
        (appends allergen_info)
        ↓
      Results screen                  app/results.tsx
        ├── DailySnapshot             src/components/DailySnapshot.tsx
        ├── ProductPulse              src/components/ProductPulse.tsx
        ├── IngredientCard (×N)       src/components/IngredientCard.tsx
        │     L1: name + status badge + functional purpose
        │     L2: scientific name + exposure context (ventilation icon for hazards)
        │     L3: science note + regulatory context + literacy flag + EDC concern
        ├── SessionSnapshotToast      src/components/SessionSnapshotToast.tsx
        │     (compound exposure story when 2+ signal types present)
        └── CompoundGroupFrame        src/components/CompoundGroupFrame.tsx
              (teal-purple hairline on thyroid+estrogen synergy pairs)
```

---

## 5. Services Reference

| Service | File | Role |
|---|---|---|
| Analysis orchestrator | `src/services/analysisService.ts` | Entry point: INCI normalise → classify → extract → Gemini → allergen merge |
| Gemini wrapper | `src/services/geminiService.ts` | One-shot prompt → `Ingredient[]`; graceful degradation on failure |
| Allergen lookup | `src/services/allergenService.ts` | O(1) alias map for Milk, Egg, Wheat families |
| Product classifier | `src/services/classifierService.ts` | Anchor-text classifier → `ProductType` |
| EDC lookup | `src/services/edcService.ts` | Endocrine Disrupting Chemical check + respiratory hazard flag |
| OCR | `src/services/ocrService.ts` | ML Kit `TextRecognition.recognize()` wrapper |
| Image preprocessing | `src/services/imageProcessingService.ts` | Crop + upscale for OCR quality |
| INCI normalization | `src/services/inciNormalization.ts` | Latin/French → English synonym pass before tokenization |
| Routine / history | `src/services/routineService.ts` | In-memory scan index; compound exposure detection across sessions |

---

## 6. Components Reference

| Component | Role |
|---|---|
| `IngredientCard` | Three-tier expandable disclosure card (L1/L2/L3). Primary result surface. |
| `ProductPulse` | Horizontal metric bar: product type, allergen match, primary ingredient. |
| `DailySnapshot` | Weather-toned risk strip (clear/bright/mixed/shifting) with tone headline. |
| `SkeletonLoader` | Pulsing placeholder during async Gemini analysis. |
| `CameraOverlay` | State-driven viewfinder frame (passive / barcode-lock / OCR / handoff). |
| `UniversalOcrBridge` | `ScanStage` header, `BridgeHandoff` interstitial, `ResearchSlateContainer` chrome. |
| `DiscoveryHero` | "First light on this label" framing for UNKNOWN products with >0 ingredients. |
| `TransparencySandwich` | Icon-content-icon layout row; owns `MagnifyingGlassSvg` + `VentilationSvg`. |
| `SessionSnapshotToast` | Bottom ribbon: compound exposure story (2+ signal types required). |
| `CompoundGroupFrame` | Teal-to-purple hairline border for thyroid+estrogen synergy pairs. |
| `CumulativeResearchNote` | Tier 2 aggregate: renders when both thyroid and estrogen pathways detected. |
| `ScienceNoteReveal` | Staggered deep-purple strip for EDC family / validated signal. |

Utility modules (non-rendering, live in `src/components/`):

| Module | Role |
|---|---|
| `dailySnapshotMetrics.ts` | Weighted status scoring → tone + segment data for DailySnapshot. |
| `sessionSnapshotExposure.ts` | `hasCompoundExposure()` gate: 2+ of allergen / risk family / EDC / warning/avoid. |
| `universalBridgeResolve.ts` | Thyroid (Resorcinol) + estrogen (Oxybenzone-3) synergy resolver → `AggregateBridgeResult`. |

---

## 7. Static Data

| File | Contents |
|---|---|
| `src/data/edcData.ts` | EDC reference set (parabens, UV filters). Placeholder — awaiting full Toxicology list. |
| `src/data/gtinMicroLiteracy.ts` | GTIN → ghost pill micro-label map for barcode efficiency layer. |

---

## 8. Implemented vs. Planned

### Implemented
- On-device OCR via ML Kit
- Real-time barcode scanning with ghost pill overlay and GTIN micro-labels
- Viewfinder state machine (`passive_search → barcode_lock / ocr_synthesis → handoff`)
- INCI synonym normalization (Latin/French)
- Product type classification (FOOD / COSMETIC / HOUSEHOLD / UNKNOWN)
- Full `Ingredient` schema from Gemini (11 fields)
- Allergen detection with alias matching (Milk, Egg, Wheat)
- EDC lookup with respiratory hazard flag
- Compound exposure detection (2+ signal types)
- Thyroid + estrogen pathway synergy detection
- Three-tier expandable ingredient cards
- DailySnapshot weather-tone risk summary
- Routine/session scan history (in-memory)

### Planned / Not Yet Implemented
- **Translation Toggle:** UI switch between Scientific (INCI) name and Common name on IngredientCard.
- **User allergen profile:** Custom allergen list persisted to device storage.
- **EDC data completeness:** Full toxicology list pending; current set is parabens + UV filters only.
- **Barcode → product lookup:** GTIN ghost labels are display-only; no product database call yet.
- **Persistent scan history:** `routineService` is in-memory only; no AsyncStorage or SQLite backing.

---

## 9. Environment & Keys

API key loaded from `.env.local`:

```
EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
```

---

## 10. Local Development Commands

```bash
# Install dependencies
npm install

# Start Metro bundler (Expo Go)
npx expo start

# Run on Android emulator (requires JAVA_HOME and Node 22)
eval "$(fnm env)" && fnm use 22 && \
  JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" \
  PATH="/c/Program Files/Android/Android Studio/jbr/bin:$PATH" \
  npx expo run:android

# Run on iOS simulator
npm run ios

# Tests (single run)
npm test

# Tests (watch mode)
npm run test:watch

# EAS cloud build — preview APK
npm run build:android
```

---

## 11. Dependency Hygiene

All dependency changes go through `npx expo install` (not raw `npm install`) so Expo can enforce SDK-compatible versions. Direct `npm install` is only used for pure dev tooling (jest plugins, types) that Expo doesn't manage.

**Current dependency status** (last audited 2026-04-21):

| Status | Action |
|---|---|
| `expo-blur` | Removed — was declared but never imported or installed |
| Expo SDK 54 → 55 | **Done** — all `expo-*` packages updated via `npx expo install --fix`; React 19.2.0, RN 0.83.6 |
| `react-native-svg` | Updated to 15.15.3 (SDK 55 compatible) |
| `react-test-renderer` | Pinned exactly at `19.2.0` — must always match `react` version exactly (no `^` range) |
| jest 29 → 30 | Hold — major version, dedicated pass required |
| TypeScript 5.9 → 6.0 | Hold — major version, dedicated pass required |

**Never upgrade `react-native` independently** — it must move with the Expo SDK.

### Android emulator notes
- Device: Small Phone AVD, API 35, x86_64, 4 GB RAM
- `JAVA_HOME` is not set as a system env var — must be prefixed on every `run:android` call
- The bash shell defaults to fnm's v14 slot — always run `fnm use 22` first or Expo CLI will throw `SyntaxError: Unexpected token '??='`
- Kill stale Metro before restarting: `powershell -command "Get-NetTCPConnection -LocalPort 8081 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }"`
