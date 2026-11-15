/**
 * @jest-environment node
 */
import type { AddressInfo } from 'node:net';
import { createServer } from './node';
import { createRateLimiter } from '../rateLimiter';
import { requestAnalysis } from '../../src/services/geminiService';

/**
 * End to end over real HTTP: the app's own client -> local Node adapter -> shared handler ->
 * fake Gemini. Proves both sides agree on the contract, not just each side in isolation.
 */
describe('analysis server end to end', () => {
  const generate = jest.fn();
  const server = createServer({
    generate,
    rateLimiter: createRateLimiter(100, 60_000),
    allowedOrigins: [],
  });
  let url = '';

  beforeAll(done => {
    server.listen(0, '127.0.0.1', () => {
      url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/analyze`;
      done();
    });
  });
  afterAll(done => {
    server.close(done);
  });

  it('returns explanations joined to the tokens the app sent', async () => {
    generate.mockResolvedValue(
      JSON.stringify([
        { source_token: 'sugar', common_name: 'Sugar', status: 'safe', risk_family: null },
        {
          source_token: 'sodium hydroxide',
          common_name: 'Lye',
          status: 'warning',
          risk_family: 'CORROSIVE',
        },
      ]),
    );
    const result = await requestAnalysis(
      url,
      ['sodium hydroxide', 'net wt 200g', 'sugar'],
      'HOUSEHOLD',
    );
    expect(result.map(r => [r.scientific_name, r.common_name, r.risk_family])).toEqual([
      ['sodium hydroxide', 'Lye', 'CORROSIVE'],
      ['sugar', 'Sugar', null],
    ]);
    expect(generate.mock.calls[0][0]).toContain('household');
  });

  it('answers 404 for other paths', async () => {
    const res = await fetch(url.replace('/analyze', '/other'), { method: 'POST' });
    expect(res.status).toBe(404);
  });
});
