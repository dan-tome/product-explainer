# Analysis server

A small HTTP service that holds the Gemini key so the app never has to. It has one endpoint,
`POST /analyze`. Request and response follow the versioned Zod contract in
[`shared/contract.ts`](../shared/contract.ts), and both sides validate against it.

```
app ──POST {tokens, productType}──▶ handler ──▶ shared Gemini core ──▶ Gemini
    ◀── {contractVersion, ingredients, meta: {degraded, attempts, latencyMs, …}} ──
```

## Design

- **Host-agnostic core.** [`handler.ts`](handler.ts) works on plain request/response objects.
  Each host gets a small adapter in `adapters/`. Moving to another host means writing one
  adapter file, not changing the logic.
- **Same analysis code as the app.** Prompt, structured output, token matching and retry live in
  [`shared/analysis/gemini.ts`](../shared/analysis/gemini.ts). The prompt is versioned in `shared/prompts/`.
- **Defence in depth.** Strict request schema (unknown fields rejected), 16 KB body cap, at most
  80 tokens, per-client rate limit, CORS allowlist for the web demo, and the response is
  validated against the contract before it is sent.
- **Honest degradation.** If Gemini fails twice, the response is still 200, with `meta.degraded: true`
  and unexplained placeholders, so the app can say so instead of pretending.

## Run locally

```bash
GEMINI_API_KEY=... npm run server:dev        # http://localhost:8787/analyze
EXPO_PUBLIC_ANALYSIS_URL=http://<your-LAN-IP>:8787/analyze npx expo start
```

With `EXPO_PUBLIC_ANALYSIS_URL` set, the app calls the server and never reads a Gemini key.
Without it, the app falls back to calling Gemini directly. That's for local development only.

## Hosting

Not deployed yet. The host (Azure Functions or Cloudflare Workers) is still to be chosen. Deploying
needs an adapter in `adapters/`, the key stored as a host secret, and a CI deploy job.

## Tests

- `handler.test.ts`: validation, limits, CORS, rate limiting, degraded mode
- `adapters/node.test.ts`: end to end over real HTTP, from the app's own client through the server to a fake Gemini
