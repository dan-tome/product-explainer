import { prepareLabel } from '../../src/services/analysisService';
import { GOLDEN_CASES } from '../golden/cases';
import { hashPrompt, parseDotEnv, recordCase, redact } from './recorder';

const golden = GOLDEN_CASES.find(c => c.id === 'household-drain-unblocker')!;
const fixedClock = () => new Date('2026-11-15T20:00:00Z');

describe('recordCase', () => {
  it('records the production prompt metadata and the raw reply', async () => {
    let t = 1000;
    const generate = jest.fn(async (_prompt: string) => {
      t += 850;
      return '[{"source_token":"sodium hydroxide 30%"}]';
    });
    const rec = await recordCase(golden, generate, {
      secret: 'k',
      now: () => t,
      clock: fixedClock,
    });
    expect(rec).toMatchObject({
      caseId: 'household-drain-unblocker',
      recordedAt: '2026-11-15T20:00:00.000Z',
      model: 'gemini-2.5-flash',
      promptVersion: 'v1',
      rawResponse: '[{"source_token":"sodium hydroxide 30%"}]',
      error: null,
      latencyMs: 850,
    });
    expect(rec.tokens).toEqual(prepareLabel(golden.labelText).tokens); // exactly what production sends
    const prompt = generate.mock.calls[0][0] as string;
    expect(rec.promptHash).toBe(hashPrompt(prompt));
    expect(prompt).toContain('"source_token"');
  });

  it('records failures with the key redacted', async () => {
    const generate = jest.fn().mockRejectedValue(new Error('403 for key sk-secret-123'));
    const rec = await recordCase(golden, generate, { secret: 'sk-secret-123', clock: fixedClock });
    expect(rec.rawResponse).toBeNull();
    expect(rec.error).toBe('403 for key [REDACTED]');
  });
});

describe('helpers', () => {
  it('hashPrompt is stable and change-sensitive', () => {
    expect(hashPrompt('abc')).toBe(hashPrompt('abc'));
    expect(hashPrompt('abc')).not.toBe(hashPrompt('abd'));
    expect(hashPrompt('abc')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('redact removes every occurrence and ignores an empty secret', () => {
    expect(redact('a KEY b KEY', 'KEY')).toBe('a [REDACTED] b [REDACTED]');
    expect(redact('unchanged', '')).toBe('unchanged');
  });

  it('parseDotEnv reads quoted and unquoted values, skipping comments', () => {
    expect(parseDotEnv('# c\nEXPO_PUBLIC_GEMINI_API_KEY="abc=1"\nOTHER=x\n\nBAD')).toEqual({
      EXPO_PUBLIC_GEMINI_API_KEY: 'abc=1',
      OTHER: 'x',
    });
  });
});
