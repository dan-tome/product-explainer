# Handoff: HealthScan portfolio build

**Updated:** 2026-11-15 · **Branch:** `ccr-da48948f-e0dz4i` · **Read with:** `CLAUDE.md` (product facts, constraints), `PROJECT_DNA.md` (vision)

## Goal

HealthScan is a public portfolio piece. A hiring manager should be able to look at it for about 5 minutes and come away convinced of four things: TypeScript end to end, rigorous LLM engineering, mobile craft, and responsible handling of health information. Rank every task by how much it changes that 5-minute impression.

**Public-safe rule:** this repo is **already public**. Never write employer names, colleague names or personal career details into code, docs, commits or PRs. The career brief that shaped this plan stays private and isn't needed to execute it.

**Budget rule:** £0. Use free tiers only (Azure free/consumption plan, GitHub Actions, EAS free tier, Sentry free tier). No paid developer accounts: no Google Play, no Apple TestFlight.

---

## Portfolio goals (every milestone must advance at least one)

| ID | Goal |
|---|---|
| G1 | A shipped, installable consumer mobile app |
| G2 | Public code a reviewer can read and run |
| G3 | LLM features in a product: structured output, evals, cost/latency, safety |
| G4 | A production TypeScript serverless back end |
| G5 | Mobile-specific craft: offline, camera/permissions, low-end performance, E2E |
| G6 | Product metrics, UX ownership, accessibility |
| G7 | Responsible work in a new domain (health) |

---

## Architecture

```
┌──────────────────── Expo app (strict TS) ─────────────────────┐
│ Camera → ML Kit OCR (on device) → INCI normalise → classify  │
│ → tokenise → local cache lookup (token + promptVersion)       │
│        │ cache miss: send TEXT tokens only, never the image   │
└────────┼──────────────────────────────────────────────────────┘
         ▼  HTTPS POST /analyze   (contract v1)
┌──────── Azure Functions (Node 22, TypeScript) ────────────────┐
│ Zod-validate request → rate limit → Gemini 2.5 Flash          │
│ (responseSchema, versioned prompt) → Zod-validate response    │
│ → join results by echoed token (not by position)              │
│ → { ingredients, meta: promptVersion, model, latency, cost }  │
│ Key in Key Vault / app settings · App Insights · Bicep IaC    │
└───────────────────────────────────────────────────────────────┘
         ▲ the same contract + prompts are imported by
┌──────── shared/ ──────────┐   ┌──────── evals/ ────────────────┐
│ contract/ Zod schemas v1  │   │ golden labels → scorer         │
│ prompts/  v1, v2…         │   │ replay tier: every PR          │
└───────────────────────────┘   │ live tier: prompt PRs, nightly │
                                └────────────────────────────────┘
```

**Decisions (already made, don't reopen):**
- **Folder layout:** the app stays at the repo root. Add `server/`, `shared/` and `evals/`. No monorepo move.
- **One Zod contract** in `shared/contract`, imported by the app, the server and the evals. A dependency-direction check in CI (dependency-cruiser or ESLint boundaries) stops `app/`/`src/` importing `server/` and vice versa.
- **Allergen and EDC logic stays on the device**, deterministic and unit-tested. The LLM only supplies the explanations.
- **Sources come from a curated reference table** in `src/data/`, with the model choosing from it. LLMs make up citations, so they never generate sources.
- **No A/B tests**, because there aren't enough real users for a result to mean anything. Do funnel metrics and telemetry instead.
- **Distribution:** an EAS preview APK linked from the README, plus a web demo on GitHub Pages that replays recorded responses. No app stores.
- **E2E:** Maestro (simpler with Expo than Detox).
- **Contract changes** (for example, adding `degraded` and `confidence` to `Ingredient`) are explicitly authorised by this plan. Update `src/types/product.ts`, `shared/contract` and `CLAUDE.md` in the same PR.

---

## Evals: parity testing for the LLM (the centrepiece)

| Tier | Runs | Network | Checks |
|---|---|---|---|
| **Replay** | Every PR | None (recorded responses) | Schema validity, joining by token, allergen merge, degraded-state handling |
| **Live** | PRs touching `shared/prompts` or the contract, plus nightly; only on `main` or labelled PRs (no fork access to secrets) | Real Gemini through the function | `common_name` accuracy, `risk_family` recall on the hazard set, hallucination rate, safety floor, p95 latency, cost per scan |
| **Planted faults** | Script (`npm run evals:faults`) | Either | Inject known faults into the prompt or the post-processor, count how many cases catch each one, and publish the table |

How the live-tier checks work:
- **Hallucination rate:** any output ingredient that can't be traced back to an input token counts as a hallucination.
- **Safety floor:** a known hazard must never come back as `safe`.

Thresholds live in `evals/thresholds.json` and block the merge. Results are written to `evals/results/`, published to GitHub Pages, and summarised in the README.

---

## Milestones

Execute in order. Each milestone is about 10 to 20 small, reviewable commits or PRs.

| # | Milestone | Definition of done | Goals |
|---|---|---|---|
| **M1** | **Go public safely** | `temp/` and `.idea/` are no longer tracked and are in `.gitignore`. `.claude/settings.local.json` is no longer tracked. ESLint and Prettier run in CI. All 74 skipped stubs are implemented or deleted, so there are 0 skipped tests. A gitleaks scan of the full history is clean apart from the allowlisted revoked key. "Not medical advice" copy is in the app and the README. `.cursor/rules` facts are refreshed. CI is green with a badge. The historical revoked-key finding is allowlisted in `.gitleaks.toml` with a comment. The repo is already public. | G2, G7 |
| **M2** | **Contract + serverless back end** | `shared/contract` v1 exists, with contract tests on both sides. The Azure Function `/analyze` is deployed by GitHub Actions (OIDC sign-in, Bicep, consumption plan). A CI check fails if the app bundle contains a key. `EXPO_PUBLIC_GEMINI_API_KEY` is removed. Gemini uses `responseSchema`. Results join by token, with a regression test for the position bug at `geminiService.ts:100`. Timeout, one retry, and a `degraded` flag shown as a calm notice in the palette's colours. | G4, G3 |
| **M3** | **Evals in CI** | At least 40 golden labels (food, cosmetic, household, OCR-noisy text, French/Latin INCI, labels with marketing text mixed in). The replay tier runs on every PR. The live tier blocks prompt changes. Prompts are versioned in `shared/prompts`. The planted-fault table is published. A demonstration PR with a deliberate prompt regression fails CI (keep it as evidence). | G3 |
| **M4** | **Mobile craft** | Results are cached so repeat scans work offline (key: token + prompt version). Camera permission states are handled: denied, limited, re-request. Scan-to-result time and startup time are measured on a low-end Android emulator profile and recorded in the README. Maestro flows run on an Android emulator in CI, driven by fixture images. | G5, G1 |
| **M5** | **Responsibility, accessibility, metrics** | A confidence indicator on each card. Sources come from the curated table. A user allergen profile is persisted (`CLAUDE.md` §8). Screen-reader labels and dynamic type work. A unit test confirms every `STATUS_COLOR` pair meets a 4.5:1 contrast ratio. Sentry (free tier). Funnel events (scan → OCR → analysis → card expanded) and per-scan cost and latency go to App Insights, with a dashboard screenshot in the README. | G6, G7 |
| **M6** | **Ship (free)** | EAS preview APK built from CI and linked in the README. The web demo (replayed responses, sample labels, no key) is deployed to GitHub Pages. The README is complete (outline below). ADRs are in `docs/adr/`. Changelog and a GitHub release are done. | G1, G2 |

---

## README outline (target for M6; start the skeleton in M1)

1. **Hero:** a one-line pitch, a scan → explanation GIF, badges (CI, evals, coverage, license), links to the **web demo** and the **APK**.
2. **Why it exists:** label jargon as the problem. It educates rather than alarms (the research palette, no traffic lights).
3. **How it works:** the architecture diagram, and what runs on the device versus in the cloud (the image never leaves the phone).
4. **Testing the AI:** golden-set size, the latest scores, the planted-fault table, a link to the full report.
5. **Engineering practices:** versioned contract, CI gates, E2E tests, offline cache, telemetry, how secrets are handled.
6. **Responsible health information:** disclaimer, confidence, sources, allergen profile, accessibility.
7. **Performance and cost:** p95 latency, cost per scan, low-end device numbers.
8. **Design decisions:** ADR links (no traffic lights, OCR on the device, a key proxy, structured output plus evals, Azure Functions).
9. **Run it locally:** app, function, evals.
10. **Roadmap and changelog.**
11. **About the author:** a short, generic narrative ("reliability-first engineering from regulated finance, applied to AI and mobile"). No employer names.

---

## Baseline (verified 2026-11-15)

- `npm ci` is clean on Node 22. `npm run typecheck` reports 0 errors. `npm test` gives 196 passed and 74 skipped.
- CI is in `.github/workflows/ci.yml` (typecheck + jest).
- Known bugs to fix in M2:
  - `analyzeWithGemini` swallows every error with `catch {}`.
  - Results join by position (`ingredients[i]`), but the model drops non-ingredient tokens, so results get paired with the wrong ingredient.
  - `JSON.parse` runs on free text, with no response schema.

## Working agreements

- Work on branch `ccr-da48948f-e0dz4i`. Don't open PRs unless the owner asks.
- Runtime deps go through `npx expo install`. Never bump `react-native` separately from the Expo SDK. Keep `react-test-renderer` pinned exactly to `react`.
- Run `npm run verify` before every commit, and keep CI green.
- Follow the Theme/motion rules and the `STATUS_COLOR` mapping (`CLAUDE.md` §2).
- Keep `CLAUDE.md` accurate in the same commit as any change it describes.
- At the end of each milestone, report: the definition of done met item by item (with evidence), what slipped, and which owner actions are needed.

## Owner actions (things only the owner can do)

- ~~Revoke the leaked Gemini key~~ **Done (2026-11-15).** The key in `.claude/settings.local.json` (commit `50c16cd`) has been revoked and no longer works. It stays in history, so allowlist that one finding in `.gitleaks.toml` with a comment saying it was revoked. Don't rewrite history on `main` without the owner's approval.
- For M1: enable GitHub Pages.
- For M2: an Azure subscription (free tier), and an OIDC federated credential for GitHub Actions. Add `GEMINI_API_KEY` as a repo secret.
- For M6: an Expo account (free) for EAS builds, with `EXPO_TOKEN` added as a repo secret.
