/// <reference types="node" />
/**
 * Records real Gemini responses for the golden set: `npm run evals:record`.
 *
 *   npm run evals:record                  record every golden case
 *   npm run evals:record -- --only <id>   record one case
 *   npm run evals:record -- --dry-run     show what would be sent; no key, no network
 *
 * Key: GEMINI_API_KEY or EXPO_PUBLIC_GEMINI_API_KEY from the environment or .env.local.
 * The key is never printed or written; error messages are redacted before saving.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createGeminiGenerate } from '../../shared/analysis/gemini';
import { PROMPT_VERSION } from '../../shared/prompts/v1';
import { GOLDEN_CASES } from '../golden/cases';
import { parseDotEnv, recordCase } from './recorder';
import { prepareLabel } from '../../src/services/analysisService';

const OUT_DIR = path.join(process.cwd(), 'evals', 'recordings');

const readKey = (): string => {
  const fromEnv = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (fromEnv) return fromEnv;
  const envFile = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envFile)) return '';
  const vars = parseDotEnv(fs.readFileSync(envFile, 'utf8'));
  return vars.GEMINI_API_KEY || vars.EXPO_PUBLIC_GEMINI_API_KEY || '';
};

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const onlyIndex = args.indexOf('--only');
  const only = onlyIndex >= 0 ? args[onlyIndex + 1] : undefined;
  const cases = only ? GOLDEN_CASES.filter(c => c.id === only) : GOLDEN_CASES;
  if (cases.length === 0) {
    console.error(
      `No golden case with id "${only}". Ids: ${GOLDEN_CASES.map(c => c.id).join(', ')}`,
    );
    process.exit(1);
  }

  if (dryRun) {
    for (const c of cases) {
      const { productType, tokens } = prepareLabel(c.labelText);
      console.log(
        `${c.id.padEnd(34)} ${productType.padEnd(9)} ${tokens.length} tokens: ${tokens.join(' | ')}`,
      );
    }
    console.log(`\nDry run: ${cases.length} case(s); nothing sent.`);
    return;
  }

  const key = readKey();
  if (!key) {
    console.error(
      'No Gemini key found. Set GEMINI_API_KEY, or EXPO_PUBLIC_GEMINI_API_KEY in .env.local.',
    );
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generate = createGeminiGenerate(key);
  let failures = 0;
  for (const c of cases) {
    const rec = await recordCase(c, generate, { secret: key });
    fs.writeFileSync(path.join(OUT_DIR, `${c.id}.json`), JSON.stringify(rec, null, 2) + '\n');
    if (rec.error) failures++;
    console.log(
      `${rec.error ? '✗' : '✓'} ${c.id.padEnd(34)} ${String(rec.latencyMs).padStart(6)} ms${rec.error ? `  ${rec.error}` : ''}`,
    );
  }
  console.log(
    `\n${cases.length - failures}/${cases.length} recorded to evals/recordings/ (prompt ${PROMPT_VERSION}).`,
  );
  if (failures) process.exit(1);
};

main().catch(e => {
  console.error('Recording failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
