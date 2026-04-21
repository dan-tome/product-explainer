/**
 * INCI / label text normalization for global stress-tests (Latin & French synonyms).
 * Applied to raw OCR text before ingredient tokenization — not a full INCI dictionary.
 */
export function applyInciSynonymsToLabelText(text: string): string {
  let t = text;
  const rules: [RegExp, string][] = [
    [/\bde l['']?eau\b/gi, 'water'],
    [/\bd['']?eau\b/gi, 'water'],
    [/\beau\b/gi, 'water'],
    // specific parfum phrases before generic parfum
    [/\bparfum\s*\(fragrance\)/gi, 'fragrance'],
    [/\bparfume\b/gi, 'fragrance'],
    [/\bparfums\b/gi, 'fragrance'],
    [/\bparfum\b/gi, 'fragrance'],
    [/\bfragrance\b/gi, 'fragrance'],
    // specific huile phrases before generic huile
    [/\bhuile min[eé]rale\b/gi, 'mineral oil'],
    [/\bhuile\b/gi, 'oil'],
    [/\baceite\b/gi, 'oil'],
    [/\bagua\b/gi, 'water'],
    // \b does not match non-ASCII chars — use lookahead/lookbehind for água
    [/(?<![a-z])água(?![a-z])/gi, 'water'],
  ];
  for (const [re, rep] of rules) {
    t = t.replace(re, rep);
  }
  return t;
}
