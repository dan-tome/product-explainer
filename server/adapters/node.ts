/// <reference types="node" />
import http from 'node:http';
import { createGeminiGenerate } from '../../shared/analysis/gemini';
import { handleAnalyze, MAX_BODY_BYTES, type HandlerDeps } from '../handler';
import { createRateLimiter } from '../rateLimiter';

/**
 * Local Node adapter for development and end-to-end tests: `npm run server:dev`.
 * Env: GEMINI_API_KEY (required), PORT (default 8787), ALLOWED_ORIGINS (comma-separated).
 */
export const createServer = (deps: HandlerDeps) =>
  http.createServer((req, res) => {
    if (req.url?.split('?')[0] !== '/analyze') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'not_found', message: 'Not found.' } }));
      return;
    }
    let body = '';
    let tooLarge = false;
    req.setEncoding('utf8');
    req.on('data', chunk => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > MAX_BODY_BYTES) tooLarge = true;
    });
    req.on('end', async () => {
      const result = await handleAnalyze(
        {
          method: req.method ?? 'GET',
          body: tooLarge ? 'x'.repeat(MAX_BODY_BYTES + 1) : body,
          origin: req.headers.origin,
          clientKey: req.socket.remoteAddress ?? 'unknown',
        },
        deps,
      );
      res.writeHead(result.status, result.headers);
      res.end(result.body);
    });
  });

if (require.main === module) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Set GEMINI_API_KEY to run the analysis server.');
    process.exit(1);
  }
  const port = Number(process.env.PORT ?? 8787);
  createServer({
    generate: createGeminiGenerate(apiKey),
    rateLimiter: createRateLimiter(30, 60_000),
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean),
  }).listen(port, () =>
    console.log(`HealthScan analysis server on http://localhost:${port}/analyze`),
  );
}
