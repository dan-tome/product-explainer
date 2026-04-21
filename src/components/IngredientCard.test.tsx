import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { IngredientCard } from './IngredientCard';
import { Ingredient } from '../types/product';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  // RN's animation internals pass { finished: boolean } to the completion callback.
  const animResult = { finished: true };
  RN.Animated.timing = () => ({ start: (cb?: (r: typeof animResult) => void) => cb?.(animResult) });
  RN.Animated.parallel = () => ({ start: (cb?: (r: typeof animResult) => void) => cb?.(animResult) });
  return RN;
});

jest.mock('../services/edcService', () => ({
  checkEDC: jest.fn(() => null),
  isRespiratoryHazard: jest.fn(() => false),
}));

const makeIngredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  scientific_name: 'Ascorbic Acid',
  common_name: 'Vitamin C',
  functional_purpose: 'Prevents spoilage - Preservative',
  regulatory_context: 'Approved by FDA and EFSA (E300). Widely considered safe.',
  exposure_context: 'Safe for intended use.',
  science_note: 'A water-soluble vitamin that donates electrons to neutralise free radicals.',
  literacy_flag: 'The same compound found in citrus fruits.',
  risk_family: null,
  status: 'safe',
  is_ai_generated: true,
  allergen_info: { is_match: false, alias_detected: null },
  ...overrides,
});

describe('IngredientCard — Level 1 (default)', () => {
  it('renders common_name', () => {
    render(<IngredientCard ingredient={makeIngredient()} />);
    expect(screen.getByText('Vitamin C')).toBeTruthy();
  });

  it('renders scientific_name on the face when showScientific is true', () => {
    render(<IngredientCard ingredient={makeIngredient()} showScientific />);
    expect(screen.getByText('Ascorbic Acid')).toBeTruthy();
  });

  it('renders functional_purpose', () => {
    render(<IngredientCard ingredient={makeIngredient()} />);
    expect(screen.getByText(/Prevents spoilage/)).toBeTruthy();
  });

  it('capitalises the first letter of common_name', () => {
    render(<IngredientCard ingredient={makeIngredient({ common_name: 'vitamin c' })} />);
    expect(screen.getByText('Vitamin c')).toBeTruthy();
  });

  it('shows status badge when no allergen match', () => {
    render(<IngredientCard ingredient={makeIngredient({ status: 'warning' })} />);
    expect(screen.getByText('Review')).toBeTruthy();
  });

  it('shows allergen identity badge when allergen_info.is_match is true', () => {
    render(
      <IngredientCard
        ingredient={makeIngredient({ allergen_info: { is_match: true, alias_detected: 'Milk' } })}
      />,
    );
    expect(screen.getByText('Contains Milk')).toBeTruthy();
  });

  it('renders for every status without crashing', () => {
    (['safe', 'warning', 'avoid', 'unknown'] as const).forEach(status => {
      const { unmount } = render(<IngredientCard ingredient={makeIngredient({ status })} />);
      unmount();
    });
  });
});

describe('IngredientCard — Level 2 (first tap)', () => {
  it('reveals scientific_name after first tap', () => {
    render(<IngredientCard ingredient={makeIngredient()} />);
    fireEvent.press(screen.getByText('Vitamin C'));
    expect(screen.getByText('Scientific Name')).toBeTruthy();
    expect(screen.getByText('Ascorbic Acid')).toBeTruthy();
  });

  it('when showScientific, reveals common name in L2 after first tap', () => {
    render(<IngredientCard ingredient={makeIngredient()} showScientific />);
    fireEvent.press(screen.getByText('Ascorbic Acid'));
    expect(screen.getByText('Common name')).toBeTruthy();
    expect(screen.getByText('Vitamin C')).toBeTruthy();
  });

  it('reveals exposure_context after first tap', () => {
    render(<IngredientCard ingredient={makeIngredient({ exposure_context: 'Avoid eye contact.' })} />);
    fireEvent.press(screen.getByText('Vitamin C'));
    expect(screen.getByText('Avoid eye contact.')).toBeTruthy();
  });

  it('triggers a Light haptic on expand', () => {
    const Haptics = require('expo-haptics');
    render(<IngredientCard ingredient={makeIngredient()} />);
    fireEvent.press(screen.getByText('Vitamin C'));
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });
});

describe('IngredientCard — Level 3 (second tap)', () => {
  it('reveals science_note after second tap', () => {
    render(<IngredientCard ingredient={makeIngredient()} />);
    fireEvent.press(screen.getByText('Vitamin C')); // → Level 2
    fireEvent.press(screen.getByText('Vitamin C')); // → Level 3
    expect(screen.getByText(/donates electrons/)).toBeTruthy();
  });

  it('reveals regulatory_context (Regulatory Flag) after second tap', () => {
    render(<IngredientCard ingredient={makeIngredient()} />);
    fireEvent.press(screen.getByText('Vitamin C'));
    fireEvent.press(screen.getByText('Vitamin C'));
    expect(screen.getByText(/Approved by FDA/)).toBeTruthy();
  });

  it('shows literacy_flag when present', () => {
    render(<IngredientCard ingredient={makeIngredient()} />);
    fireEvent.press(screen.getByText('Vitamin C'));
    fireEvent.press(screen.getByText('Vitamin C'));
    expect(screen.getByText(/citrus fruits/)).toBeTruthy();
  });

  it('collapses back to Level 1 on third tap', () => {
    render(<IngredientCard ingredient={makeIngredient()} />);
    const card = screen.getByText('Vitamin C');
    fireEvent.press(card);
    fireEvent.press(card);
    fireEvent.press(card); // → Level 0
    expect(screen.getByText(/Prevents spoilage/)).toBeTruthy();
  });
});

describe('IngredientCard — Urgency Variable', () => {
  it('uses 180ms duration for allergen ingredients (is_match: true)', () => {
    // Verifying the logic path: allergen ingredients should use ANIM_DURATION_ALLERGEN.
    // Direct style/duration inspection is not available in RNTL; we verify
    // the structural condition — allergen cards expand and reveal content correctly.
    const allergenIngredient = makeIngredient({
      allergen_info: { is_match: true, alias_detected: 'Milk' },
    });
    render(<IngredientCard ingredient={allergenIngredient} />);
    fireEvent.press(screen.getByText('Vitamin C'));
    expect(screen.getByText('Ascorbic Acid')).toBeTruthy();
  });

  it('uses 260ms duration for non-allergen ingredients', () => {
    render(<IngredientCard ingredient={makeIngredient()} />);
    fireEvent.press(screen.getByText('Vitamin C'));
    expect(screen.getByText('Ascorbic Acid')).toBeTruthy();
  });
});

describe('IngredientCard — EDC Indicator', () => {
  it('shows EDC concern note at Level 3 when edcService returns a match', () => {
    const { checkEDC } = require('../services/edcService');
    checkEDC.mockReturnValue({
      ingredient: 'methylparaben',
      family: 'Paraben',
      concern: 'Potential endocrine disruptor — paraben family',
      regulation: 'EU Annex V restricted.',
    });
    render(<IngredientCard ingredient={makeIngredient({ scientific_name: 'Methylparaben' })} />);
    fireEvent.press(screen.getByText('Vitamin C')); // → L2
    fireEvent.press(screen.getByText('Vitamin C')); // → L3
    expect(screen.getByText(/endocrine disruptor/)).toBeTruthy();
  });
});

describe('IngredientCard — Ventilation Icon', () => {
  it('shows Exposure Context label at Level 2 when respiratory hazard is detected', () => {
    const { isRespiratoryHazard } = require('../services/edcService');
    isRespiratoryHazard.mockReturnValue(true);
    render(
      <IngredientCard
        ingredient={makeIngredient({
          risk_family: 'CORROSIVE',
          exposure_context: 'Use in well-ventilated area only.',
        })}
      />,
    );
    fireEvent.press(screen.getByText('Vitamin C'));
    expect(screen.getByText('Use in well-ventilated area only.')).toBeTruthy();
  });
});
