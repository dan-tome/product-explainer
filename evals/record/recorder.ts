import { prepareLabel } from '../../src/services/analysisService';
import { buildAnalysisPrompt, GEMINI_MODEL, type GenerateFn } from '../../shared/analysis/gemini';
import { PROMPT_VERSION } from '../../shared/prompts/v1';
import type { GoldenCase } from '../golden/cases';

/**
 * One recorded Gemini exchange for a golden case. Replay tests feed `rawResponse` back through
 * the app's post-processing, and live scoring grades it against the golden expectations.
 */
export interface Recording {
  caseId: string;
  recordedAt: string;
  model: string;
  promptVersion: string;
  /** FNV-1a hash of the exact prompt, so replay can tell when a recording is stale. */
  promptHash: string;
  productType: string;
  tokens: string[];
  rawResponse: string | null;
  error: string | null;
  latencyMs: number;
}

/** Small, dependency-free, stable 32-bit FNV-1a hash (hex). Not for security, just change detection. */
export const hashPrompt = (text: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

/** Removes every occurrence of the secret from a message before it is printed or saved. */
export const redact = (message: string, secret: string): string =>
  secret ? message.split(secret).join('[REDACTED]') : message;

export const recordCase = async (
  golden: GoldenCase,
  generate: GenerateFn,
  options: { secret: string; now?: () => number; clock?: () => Date } = { secret: '' },
): Promise<Recording> => {
  const now = options.now ?? Date.now;
  const clock = options.clock ?? (() => new Date());
  const { productType, tokens } = prepareLabel(golden.labelText);
  const prompt = buildAnalysisPrompt(tokens, productType);
  const base = {
    caseId: golden.id,
    recordedAt: clock().toISOString(),
    model: GEMINI_MODEL,
    promptVersion: PROMPT_VERSION,
    promptHash: hashPrompt(prompt),
    productType,
    tokens,
  };

  const started = now();
  try {
    const rawResponse = await generate(prompt);
    return { ...base, rawResponse, error: null, latencyMs: now() - started };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ...base,
      rawResponse: null,
      error: redact(message, options.secret),
      latencyMs: now() - started,
    };
  }
};

/** Reads KEY=VALUE pairs from a dotenv-style file's contents (no expansion, no export prefix). */
export const parseDotEnv = (contents: string): Record<string, string> =>
  Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const i = line.indexOf('=');
        return [
          line.slice(0, i).trim(),
          line
            .slice(i + 1)
            .trim()
            .replace(/^(['"])(.*)\1$/, '$2'),
        ];
      }),
  );
