import { AnalyzeResponseSchema, ErrorResponseSchema, MAX_TOKENS } from '../shared/contract';
import { handleAnalyze, MAX_BODY_BYTES, type HandlerDeps, type HttpRequest } from './handler';
import { createRateLimiter } from './rateLimiter';

const geminiReply = JSON.stringify([
  {
    source_token: 'salt',
    common_name: 'Table salt',
    functional_purpose: 'Seasoning - Flavour',
    status: 'safe',
    risk_family: null,
  },
]);

const makeDeps = (overrides: Partial<HandlerDeps> = {}): HandlerDeps => ({
  generate: jest.fn().mockResolvedValue(geminiReply),
  rateLimiter: createRateLimiter(100, 60_000),
  allowedOrigins: ['https://demo.example'],
  ...overrides,
});

const post = (body: unknown, extra: Partial<HttpRequest> = {}): HttpRequest => ({
  method: 'POST',
  body: typeof body === 'string' ? body : JSON.stringify(body),
  clientKey: '1.2.3.4',
  ...extra,
});

const valid = { tokens: ['salt'], productType: 'FOOD' };

describe('handleAnalyze', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('returns contract-valid explanations for a valid request', async () => {
    const res = await handleAnalyze(post(valid), makeDeps());
    expect(res.status).toBe(200);
    const body = AnalyzeResponseSchema.parse(JSON.parse(res.body));
    expect(body.ingredients[0].common_name).toBe('Table salt');
    expect(body.meta).toMatchObject({
      model: 'gemini-2.5-flash',
      promptVersion: 'v1',
      attempts: 1,
      degraded: false,
    });
  });

  it('reports degraded=true (still 200) when Gemini fails twice', async () => {
    const res = await handleAnalyze(
      post(valid),
      makeDeps({ generate: jest.fn().mockRejectedValue(new Error('down')) }),
    );
    expect(res.status).toBe(200);
    const body = AnalyzeResponseSchema.parse(JSON.parse(res.body));
    expect(body.meta).toMatchObject({ degraded: true, attempts: 2 });
    expect(body.ingredients[0]).toMatchObject({ scientific_name: 'salt', status: 'unknown' });
  });

  it.each([
    ['non-JSON body', 'not json', 'invalid_json'],
    ['missing tokens', { productType: 'FOOD' }, 'invalid_request'],
    ['empty tokens', { tokens: [], productType: 'FOOD' }, 'invalid_request'],
    ['unknown product type', { tokens: ['salt'], productType: 'TOY' }, 'invalid_request'],
    ['extra fields', { ...valid, apiKey: 'x' }, 'invalid_request'],
    [
      'too many tokens',
      { tokens: Array(MAX_TOKENS + 1).fill('salt'), productType: 'FOOD' },
      'invalid_request',
    ],
  ])('rejects %s with 400 and does not call Gemini', async (_name, body, code) => {
    const deps = makeDeps();
    const res = await handleAnalyze(post(body), deps);
    expect(res.status).toBe(400);
    expect(ErrorResponseSchema.parse(JSON.parse(res.body)).error.code).toBe(code);
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await handleAnalyze(post('x'.repeat(MAX_BODY_BYTES + 1)), makeDeps());
    expect(res.status).toBe(413);
  });

  it('rejects non-POST methods with 405', async () => {
    const res = await handleAnalyze(post(valid, { method: 'GET' }), makeDeps());
    expect(res.status).toBe(405);
    expect(res.headers.Allow).toBe('POST, OPTIONS');
  });

  it('rate-limits per client with 429 and Retry-After', async () => {
    const deps = makeDeps({ rateLimiter: createRateLimiter(1, 60_000) });
    await handleAnalyze(post(valid), deps);
    const res = await handleAnalyze(post(valid), deps);
    expect(res.status).toBe(429);
    expect(res.headers['Retry-After']).toBe('60');
    expect(deps.generate).toHaveBeenCalledTimes(1);
  });

  describe('CORS (web demo)', () => {
    it('allows a listed origin, including preflight', async () => {
      const pre = await handleAnalyze(
        post('', { method: 'OPTIONS', origin: 'https://demo.example' }),
        makeDeps(),
      );
      expect(pre.status).toBe(204);
      expect(pre.headers['Access-Control-Allow-Origin']).toBe('https://demo.example');
      const res = await handleAnalyze(post(valid, { origin: 'https://demo.example' }), makeDeps());
      expect(res.headers['Access-Control-Allow-Origin']).toBe('https://demo.example');
    });

    it('refuses unlisted browser origins before calling Gemini', async () => {
      const deps = makeDeps();
      const res = await handleAnalyze(post(valid, { origin: 'https://evil.example' }), deps);
      expect(res.status).toBe(403);
      expect(deps.generate).not.toHaveBeenCalled();
    });

    it('serves native apps, which send no Origin header', async () => {
      const res = await handleAnalyze(post(valid), makeDeps());
      expect(res.status).toBe(200);
      expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });
});
