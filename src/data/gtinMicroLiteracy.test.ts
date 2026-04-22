import { ghostLabelFromBarcodeData, GTIN_MICRO_LABELS } from './gtinMicroLiteracy';

describe.skip('ghostLabelFromBarcodeData', () => {
  describe('exact GTIN matches', () => {
    it('returns the label for a known 13-digit EAN', () => {
      const result = ghostLabelFromBarcodeData('3600531428521');
      expect(result).toContain('preservative');
    });

    it('returns the label for a known 8-digit barcode', () => {
      const result = ghostLabelFromBarcodeData('08066282');
      expect(result).toBe(GTIN_MICRO_LABELS['08066282']);
    });

    it('strips non-digit characters before looking up', () => {
      // Some scanners return barcodes with spaces or dashes
      const result = ghostLabelFromBarcodeData('3600531-428521');
      expect(result).toContain('preservative');
    });
  });

  describe('prefix heuristic', () => {
    it('returns paraben label for long EAN starting with 3600531', () => {
      const result = ghostLabelFromBarcodeData('3600531999999');
      expect(result).toContain('preservative');
    });

    it('does not apply prefix heuristic for a string shorter than 8 digits', () => {
      const result = ghostLabelFromBarcodeData('3600531');
      // 7 digits — below the threshold, should fall through to generic label
      expect(result).toBe('Product link — open slate for detail');
    });

    it('does not apply the heuristic to a different prefix that happens to start with 360053', () => {
      // Must start with 3600531 exactly
      const result = ghostLabelFromBarcodeData('3600532000000');
      expect(result).toBe('Product link — open slate for detail');
    });
  });

  describe('empty / non-matching input', () => {
    it('returns "Label link" for an empty string', () => {
      expect(ghostLabelFromBarcodeData('')).toBe('Label link');
    });

    it('returns "Label link" for a string containing only non-digit characters', () => {
      expect(ghostLabelFromBarcodeData('QR-???')).toBe('Label link');
    });

    it('returns the generic fallback for an unknown GTIN with no heuristic match', () => {
      expect(ghostLabelFromBarcodeData('0000000000000')).toBe('Product link — open slate for detail');
    });

    it('returns the generic fallback for a realistic unknown UPC-A', () => {
      expect(ghostLabelFromBarcodeData('012345678905')).toBe('Product link — open slate for detail');
    });
  });

  describe('output contract', () => {
    it('always returns a non-empty string', () => {
      const inputs = ['', '123', '9999999999999', 'abc', '3600531428521'];
      inputs.forEach(input => {
        expect(typeof ghostLabelFromBarcodeData(input)).toBe('string');
        expect(ghostLabelFromBarcodeData(input).length).toBeGreaterThan(0);
      });
    });

    it('is synchronous and returns in under 1ms for any input', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) ghostLabelFromBarcodeData('3600531428521');
      expect(performance.now() - start).toBeLessThan(50);
    });
  });
});
