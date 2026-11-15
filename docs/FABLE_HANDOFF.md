# Handoff: HealthScan portfolio push

**Prepared:** 2026-11-15 · **Branch:** `ccr-da48948f-e0dz4i` · **Read with:** `CLAUDE.md` (product facts, constraints), `PROJECT_DNA.md` (vision)

## Goal

Dan is changing jobs. This repo needs to work as a **portfolio piece**: something a hiring manager or senior engineer can look at for about 5 minutes and come away convinced of product sense, engineering rigour and practical AI engineering. Rank every task by *how much it changes that 5-minute impression*, not by feature count.

**Career context:** Dan's CV and career info live in a separate `work` repo. It was **deliberately not cloned**. Don't pull it in unless a task really needs it (for example, tailoring the README "About the author" section or matching the roadmap to target roles). Ask Dan first.

---

## Verified baseline (2026-11-15)

| Check | Result |
|---|---|
| `npm ci` | ✅ clean on Node 22 |
| `npm run typecheck` | ✅ 0 errors *(was ~800, fixed in this session)* |
| `npm test` | ✅ 196 passed, **74 skipped** (9 stub suites) |
| CI | ✅ added at `.github/workflows/ci.yml` (typecheck + tests); not yet run on GitHub |
| Lint | ❌ no ESLint/Prettier config |
| Runnable without a phone | ❌ native-only (ML Kit, camera); no web demo |

**Fixed this session:**
- TS 6 defaults `compilerOptions.types` to `[]`, so jest globals were invisible to `tsc`. Added `@types/jest` and `"types": ["jest"]` in `tsconfig.json`.
- `sessionSnapshotExposure.test.ts`: the `EDCMatch` fixture used the old field names (`name`, `isRespiratoryHazard`), so it was changed to `ingredient`.
- `routineService.test.ts`: added the missing `ScannedProduct` type import.
- Added `typecheck` and `verify` npm scripts. Updated `CLAUDE.md`.

---

## Findings a reviewer would notice

1. **API key ships in the client bundle.** `src/services/geminiService.ts:95` reads `EXPO_PUBLIC_GEMINI_API_KEY`, and `EXPO_PUBLIC_*` values get inlined into the JS bundle. This is the first thing a senior reviewer flags.
2. **Errors from the AI are swallowed silently.** `analyzeWithGemini` uses `catch {}` and returns placeholder ingredients ("Function not identified."). The UI can't tell a real result from a degraded one. Nothing is logged and there's no retry or timeout.
3. **Index misalignment bug.** The prompt tells Gemini to *omit* non-ingredient tokens. The fallback then uses `ingredients[i]` (`geminiService.ts:100`), which pairs the wrong token with each result as soon as anything gets dropped.
4. **No structured output or validation.** The code runs `JSON.parse` on free text. Gemini supports `responseMimeType: 'application/json'` plus `responseSchema`. Nothing checks the response shape at runtime.
5. **No AI evaluation.** There's no way to tell whether a prompt change made results better or worse.
6. **Repo hygiene.** `temp/` screenshots and `.idea/` are committed. `.claude/settings.local.json` contains Windows-local paths. `.cursor/rules/backend-ownership.mdc` still mentions SDK 54 versions and "192 tests".
7. **Test debt.** 74 `describe.skip` stubs (`DiscoveryHero`, `SessionSnapshotToast`, `CompoundGroupFrame`, `ScienceNoteReveal`, `CumulativeResearchNote`, `TransparencySandwich`, `sessionSnapshotExposure`, `useCameraPermissions`, `app/index`). Either implement them or delete them. Skipped stubs look worse than no tests.
8. **The README has no visuals**, and no "why" section explaining the design decisions (research palette instead of traffic lights, on-device OCR, three-tier disclosure).

---

## Recommended roadmap (priority order)

### P0: Make it viewable in 2 minutes
**Web demo mode, deployed.** Run Expo web with a `DEMO` path: pick from 4 to 6 bundled sample labels (food, cosmetic, household, one tricky French/Latin INCI one). They go through the real pipeline from `analyzeIngredients(text)` onward, skipping camera and OCR. Use **recorded Gemini fixtures** so the demo needs no key and costs nothing. Deploy to GitHub Pages from CI and link it at the top of the README.
- Camera, ML Kit and haptics are native-only. Guard them with `Platform.OS` or `.web.tsx` files rather than ripping them out.
- Respect the Theme/motion rules in `CLAUDE.md`. No red/green.

### P1: AI engineering, done properly (the main talent signal)
1. **Server-side key.** Add a small proxy (Cloudflare Worker or Vercel function) under `server/`. It holds the key, rate-limits requests, and the app calls it. Document the threat model in a short ADR.
2. **Structured output + validation.** Use `responseSchema` and a runtime guard (zod or hand-rolled) that maps to `Ingredient`. Have the model echo the source token so results join by token, not by index (fixes finding 3).
3. **Honest failure states.** Add timeout, one retry with backoff, and a `degraded` flag surfaced in the UI as a calm, palette-coloured notice. This is a contract change, so update `src/types/product.ts` and `CLAUDE.md` together (per `.cursor/rules/backend-ownership.mdc`).
4. **Eval harness.** Add `evals/` with golden labels → expected `common_name` / `risk_family` / `status`, plus a script that scores a prompt version. Even 15 cases and a results table in the README make a strong signal.
5. **Cache** results per normalised token in AsyncStorage. This is cheaper and faster on repeat scans.

### P2: Complete the product story
- **Barcode → Open Food Facts lookup.** `PROJECT_DNA.md` already describes the barcode-first hybrid. GTIN ghost labels are display-only today (`src/data/gtinMicroLiteracy.ts`).
- **User allergen profile** (planned in `CLAUDE.md` §8). Persist custom allergens and extend `allergenService` beyond Milk, Egg and Wheat.

### P3: Polish and presentation
- ESLint + Prettier in CI, a coverage badge, and either implemented or deleted skipped stubs.
- README rewrite: hero GIF, live demo link, architecture diagram, a "Design decisions" section, and an eval results table.
- Clean git: untrack `temp/` and `.idea/`, then add both to `.gitignore`. Check with Dan before deleting the screenshots, because they may be wanted for the README.
- `docs/adr/` with 3 or 4 short ADRs (no traffic lights, on-device OCR, key proxy, structured output).

---

## Working agreements

- Branch: `ccr-da48948f-e0dz4i`. Don't open PRs unless Dan asks.
- Runtime deps go through `npx expo install`. Never bump `react-native` separately from the Expo SDK. Keep `react-test-renderer` pinned exactly to `react`.
- Run `npm run verify` before every commit.
- Follow the Theme/motion constraints and the status → `STATUS_COLOR` mapping in `CLAUDE.md`.
- Keep `CLAUDE.md` accurate as things change. A stale guide is itself a negative signal.

## Open questions for Dan
1. What roles are you targeting (mobile, full-stack, AI/ML product engineer)? The answer changes whether P1 or P2 comes first.
2. Is a small hosted backend OK (free-tier Cloudflare/Vercel), and whose account would it run on?
3. Should the repo be public? If yes, rotate the existing Gemini key first, because it may already be in local bundles or builds.
4. Do you want the `temp/` screenshots kept for the README?
