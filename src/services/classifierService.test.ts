import { classifyProductText } from './classifierService';

describe('classifyProductText', () => {
  it('returns FOOD for nutrition facts label', () => {
    expect(classifyProductText('Nutrition Facts Calories 200')).toBe('FOOD');
  });

  it('returns COSMETIC for skin/hair keywords', () => {
    expect(classifyProductText('Apply to skin and hair, rinse thoroughly')).toBe('COSMETIC');
  });

  it('returns HOUSEHOLD for detergent keyword', () => {
    expect(classifyProductText('Heavy duty detergent for laundry')).toBe('HOUSEHOLD');
  });

  it('returns HOUSEHOLD for surfactant keyword', () => {
    expect(classifyProductText('Contains surfactant blend')).toBe('HOUSEHOLD');
  });

  it('returns HOUSEHOLD for bleach keyword', () => {
    expect(classifyProductText('With bleach for whitening')).toBe('HOUSEHOLD');
  });

  it('returns HOUSEHOLD for disinfectant keyword', () => {
    expect(classifyProductText('Hospital-grade disinfectant')).toBe('HOUSEHOLD');
  });

  it('returns HOUSEHOLD for solvent keyword', () => {
    expect(classifyProductText('Organic solvent base formula')).toBe('HOUSEHOLD');
  });

  it('returns HOUSEHOLD for cleaning keyword', () => {
    expect(classifyProductText('All-purpose cleaning spray')).toBe('HOUSEHOLD');
  });

  it('returns UNKNOWN for unrecognised text', () => {
    expect(classifyProductText('Product XY1234 batch code')).toBe('UNKNOWN');
  });

  it('is case-insensitive', () => {
    expect(classifyProductText('DETERGENT FORMULA')).toBe('HOUSEHOLD');
    expect(classifyProductText('NUTRITION FACTS')).toBe('FOOD');
  });

  it('FOOD anchors take priority over cosmetic anchors', () => {
    expect(classifyProductText('Nutrition Facts apply to skin')).toBe('FOOD');
  });
});
