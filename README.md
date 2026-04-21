# HealthScan

Turn any product label into plain English. HealthScan scans ingredient lists with your phone camera and explains what each ingredient is, what it does, and what the research says — without jargon.

## What it does

1. Point the camera at an ingredient list
2. The app reads the label using on-device OCR (Google ML Kit)
3. Gemini 2.5 Flash analyses every ingredient and returns plain-English explanations
4. A results screen shows safety status, allergen flags, EDC concerns, and expandable science notes for each ingredient

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.83.6 + Expo SDK 55 (bare workflow) |
| Navigation | Expo Router (file-based, `app/` directory) |
| Camera & OCR | `expo-camera` + `@react-native-ml-kit/text-recognition` (on-device) |
| AI analysis | Gemini 2.5 Flash via `@google/generative-ai` |
| Image processing | `expo-image-manipulator` (crop + upscale before OCR) |
| Language | TypeScript (strict) |
| Testing | Jest 30 + jest-expo + React Testing Library |

## Running locally

```bash
# Install dependencies
npm install

# Start Metro (Expo Go)
npx expo start

# Android emulator (requires Node 22 and Android Studio)
eval "$(fnm env)" && fnm use 22 && \
  JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" \
  npx expo run:android

# Tests
npm test
```

> **Node version:** the project requires Node 22. If you use fnm, run `fnm use 22` before any Expo CLI command.

## Environment

Create `.env.local` in the project root:

```
EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
```

## Architecture

```
Camera (expo-camera)
  ├── Barcode path  →  real-time scan → ghost pill label
  └── OCR path
        ↓
      Image capture + preprocessing (crop 80×40%, upscale to 1500px)
        ↓
      On-device OCR (ML Kit)
        ↓
      INCI synonym normalisation (French/Latin → English)
        ↓
      Product type classification  (FOOD / COSMETIC / HOUSEHOLD / UNKNOWN)
        ↓
      Gemini 2.5 Flash  →  Ingredient[] (11 fields per ingredient)
        ↓
      Allergen detection  (Milk, Egg, Wheat alias matching)
        ↓
      Results screen
            ├── DailySnapshot  (weather-tone risk summary)
            ├── ProductPulse   (allergen count, product type, primary ingredient)
            └── IngredientCard × N  (three-tier expandable disclosure)
```

## Project structure

```
app/                  Expo Router screens
  index.tsx           Camera + viewfinder
  results.tsx         Ingredient results screen

src/
  services/           Business logic and API wrappers
  components/         UI components
  data/               Static reference data (EDC list, GTIN micro-labels)
  types/              TypeScript interfaces
  styles/             Theme, palette, motion constants

CLAUDE.md             Full developer guide (pipeline, schema, conventions)
```

See `CLAUDE.md` for the complete developer reference including the data schema, services API, component inventory, and dependency hygiene notes.
