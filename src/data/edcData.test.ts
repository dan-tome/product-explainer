import { EDC_ENTRIES, type EDCEntry } from './edcData';

describe.skip('EDC_ENTRIES — structural invariants', () => {
  it('contains at least one entry', () => {
    expect(EDC_ENTRIES.length).toBeGreaterThan(0);
  });

  it('every entry has all required fields', () => {
    EDC_ENTRIES.forEach((entry: EDCEntry, i: number) => {
      expect(typeof entry.family, `entry[${i}].family`).toBe('string');
      expect(typeof entry.concern, `entry[${i}].concern`).toBe('string');
      expect(typeof entry.regulation, `entry[${i}].regulation`).toBe('string');
      expect(Array.isArray(entry.aliases), `entry[${i}].aliases`).toBe(true);
      expect(entry.aliases.length, `entry[${i}].aliases is non-empty`).toBeGreaterThan(0);
    });
  });

  it('every alias is a lowercase string', () => {
    EDC_ENTRIES.forEach((entry: EDCEntry, i: number) => {
      entry.aliases.forEach((alias, j) => {
        expect(alias, `entry[${i}].aliases[${j}] should be lowercase`).toBe(alias.toLowerCase());
      });
    });
  });

  it('no duplicate aliases exist across the entire dataset', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    EDC_ENTRIES.forEach(entry => {
      entry.aliases.forEach(alias => {
        if (seen.has(alias)) duplicates.push(alias);
        else seen.add(alias);
      });
    });
    expect(duplicates).toHaveLength(0);
  });

  it('no entry has a blank family, concern, or regulation', () => {
    EDC_ENTRIES.forEach((entry: EDCEntry, i: number) => {
      expect(entry.family.trim(), `entry[${i}].family`).not.toBe('');
      expect(entry.concern.trim(), `entry[${i}].concern`).not.toBe('');
      expect(entry.regulation.trim(), `entry[${i}].regulation`).not.toBe('');
    });
  });

  it('contains a Paraben family entry', () => {
    expect(EDC_ENTRIES.some(e => e.family === 'Paraben')).toBe(true);
  });

  it('contains an entry with alias "methylparaben"', () => {
    const all = EDC_ENTRIES.flatMap(e => e.aliases);
    expect(all).toContain('methylparaben');
  });

  it('contains an entry with alias "oxybenzone" or "benzophenone-3"', () => {
    const all = EDC_ENTRIES.flatMap(e => e.aliases);
    expect(all.includes('oxybenzone') || all.includes('benzophenone-3')).toBe(true);
  });

  it('no alias contains leading or trailing whitespace', () => {
    EDC_ENTRIES.forEach((entry: EDCEntry, i: number) => {
      entry.aliases.forEach((alias, j) => {
        expect(alias, `entry[${i}].aliases[${j}] has no surrounding whitespace`).toBe(alias.trim());
      });
    });
  });
});
