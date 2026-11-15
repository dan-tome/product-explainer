import { analyzeTokens, type GenerateFn } from '../shared/analysis/gemini';
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  CONTRACT_VERSION,
  type AnalyzeResponse,
} from '../shared/contract';
import type { RateLimiter } from './rateLimiter';

/**
 * Host-agnostic POST /analyze handler. Host adapters (local Node, Cloudflare, Azure) only
 * translate their request/response objects to these plain shapes and inject the dependencies.
 */
export interface HttpRequest {
  method: string;
  /** Raw body text. Adapters must cap it at MAX_BODY_BYTES before calling. */
  body: string;
  origin?: string;
  clientKey: string;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface HandlerDeps {
  generate: GenerateFn;
  rateLimiter: RateLimiter;
  /** Exact origins allowed for browser calls (the web demo). Native apps send no Origin. */
  allowedOrigins: string[];
  now?: () => number;
}

export const MAX_BODY_BYTES = 16 * 1024;

const json = (
  status: number,
  payload: unknown,
  extra: Record<string, string> = {},
): HttpResponse => ({
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  body: JSON.stringify(payload),
});

const error = (status: number, code: string, message: string, extra?: Record<string, string>) =>
  json(status, { error: { code, message } }, extra);

const corsHeaders = (origin: string | undefined, allowed: string[]): Record<string, string> =>
  origin && allowed.includes(origin)
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        Vary: 'Origin',
      }
    : {};

export const handleAnalyze = async (req: HttpRequest, deps: HandlerDeps): Promise<HttpResponse> => {
  const now = deps.now ?? Date.now;
  const started = now();
  const cors = corsHeaders(req.origin, deps.allowedOrigins);

  if (req.origin && !cors['Access-Control-Allow-Origin']) {
    return error(403, 'origin_not_allowed', 'This origin may not call the analysis API.');
  }
  if (req.method === 'OPTIONS') return { status: 204, headers: cors, body: '' };
  if (req.method !== 'POST')
    return error(405, 'method_not_allowed', 'Use POST.', { ...cors, Allow: 'POST, OPTIONS' });
  if (req.body.length > MAX_BODY_BYTES)
    return error(413, 'payload_too_large', 'Request body too large.', cors);
  if (!deps.rateLimiter.take(req.clientKey)) {
    return error(429, 'rate_limited', 'Too many requests. Try again in a minute.', {
      ...cors,
      'Retry-After': '60',
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(req.body);
  } catch {
    return error(400, 'invalid_json', 'Body must be JSON.', cors);
  }
  const parsed = AnalyzeRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return error(
      400,
      'invalid_request',
      parsed.error.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '),
      cors,
    );
  }

  const outcome = await analyzeTokens(parsed.data.tokens, parsed.data.productType, deps.generate);
  const response: AnalyzeResponse = {
    contractVersion: CONTRACT_VERSION,
    ingredients: outcome.ingredients,
    meta: {
      model: outcome.model,
      promptVersion: outcome.promptVersion,
      attempts: outcome.attempts,
      degraded: outcome.degraded,
      latencyMs: Math.max(0, now() - started),
    },
  };

  // Defensive: never send a body that breaks our own contract.
  const checked = AnalyzeResponseSchema.safeParse(response);
  if (!checked.success)
    return error(500, 'contract_violation', 'Server produced an invalid response.', cors);
  return json(200, checked.data, cors);
};
