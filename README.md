# HealthScan

[![CI](https://github.com/dan-tome/product-explainer/actions/workflows/ci.yml/badge.svg)](https://github.com/dan-tome/product-explainer/actions/workflows/ci.yml)

**Point your phone at an ingredient label and get every ingredient explained in plain English.** Tocopherol becomes "Vitamin E: keeps the oil from going rancid". No jargon, and no scare colours.

> 🚧 **Work in progress.** A live web demo, an installable Android build and published AI evaluation results are on the [roadmap](#roadmap). Current status: the Android app works end to end, and the test suite is green in CI.

<!-- TODO(M6): hero GIF of a scan turning into explanations + links to the web demo and APK -->

---

## Why it exists

Ingredient labels are written for regulators, not people. HealthScan's goal is **chemical literacy**: help people understand what is in a product, rather than tell them what to fear.

That goal drives the design:

- **No red/green traffic lights.** Statuses use a calm research palette (blues, purples, teals), so people learn instead of reacting.
- **Every chemical name comes with its common name and its purpose**, for example "Sodium Benzoate: preservative".
- **Progressive disclosure.** Each ingredient card opens in three levels: what it is → how to use it safely → the science and the regulatory context.

## How it works

```
Phone (Expo / React Native, strict TypeScript)
  Camera ─┬─ barcode → instant product hint
          └─ photo → crop + upscale → on-device OCR (ML Kit)
                  → INCI normalisation (Latin/French → English)
                  → product classifier (food / cosmetic / household)
                  → ingredient tokens
                  → Gemini 2.5 Flash: plain-English explanation for each ingredient
                  → on-device allergen + endocrine-disruptor checks
                  → results: snapshot, product pulse, ingredient cards
```

**Privacy:** OCR runs on the phone. Only the extracted ingredient text is sent for analysis, never the photo.

<!-- TODO(M2): replace with the final diagram including the serverless back end and shared contract -->

## Testing the AI

<!-- TODO(M3): golden-set size, latest scores, planted-fault table, link to the full eval report -->
Coming in milestone 3: a golden set of real labels, automated accuracy and hallucination scoring, and evals that block merges in CI.

## Engineering practices

- **Strict TypeScript** throughout. `npm run typecheck` is a CI gate.
- **CI on every PR:** ESLint (zero warnings allowed), Prettier, typecheck, Jest, and a full-history secret scan.
- **275 tests, none skipped.** Core flows such as camera capture → OCR → handoff → navigation are tested against behaviour, and each behaviour was checked by planting a fault and confirming a test fails.
- Accessibility labels and roles on the primary controls.

## Responsible health information

**HealthScan is for learning. It is not medical advice.** It explains what ingredients are and why they are used. It can't tell you what is safe for you, and AI-generated explanations can be wrong. Always check the label, and ask a pharmacist, doctor or allergist about allergies or health concerns. The app shows this notice on every results screen.

## Run it locally

Requires Node 22. Android builds also need Android Studio.

```bash
npm install
npx expo start          # Metro bundler
npm run android         # build and run on an Android emulator/device
npm run verify          # lint + format check + typecheck + tests (what CI runs)
```

Create `.env.local` in the project root:

```
EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
```

> This key currently ships in the app bundle. Milestone 2 moves it behind a serverless back end so the app never holds it.

## Tech stack

| Layer | Technology |
|---|---|
| App | React Native 0.83 + Expo SDK 55, Expo Router |
| Camera & OCR | `expo-camera`, `@react-native-ml-kit/text-recognition` (on device) |
| AI | Gemini 2.5 Flash |
| Language | TypeScript (strict) |
| Quality | Jest 30 + React Native Testing Library, ESLint, Prettier, gitleaks, GitHub Actions |

## Roadmap

| Milestone | Focus | Status |
|---|---|---|
| M1 | Public-ready repo: CI gates, real tests, secret scanning, disclaimer | ✅ Done |
| M2 | Serverless TypeScript back end (Azure Functions) holding the AI key; shared validated contract | Planned |
| M3 | LLM evals in CI: golden labels, accuracy and hallucination scoring, planted faults | Planned |
| M4 | Mobile craft: offline cache, permission states, performance on low-end devices, E2E tests | Planned |
| M5 | Confidence and sources, allergen profile, accessibility audit, telemetry | Planned |
| M6 | Web demo + Android APK, final README | Planned |

## Developer docs

- [`CLAUDE.md`](CLAUDE.md): full developer guide (pipeline, schema, conventions)
- [`docs/HANDOFF.md`](docs/HANDOFF.md): architecture plan and milestone definitions of done
