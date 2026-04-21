import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Ingredient } from '../types/product';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = ({ children }: { children?: React.ReactNode }) => React.createElement(View, {}, children);
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Defs: Stub,
    LinearGradient: Stub,
    Rect: Stub,
    Stop: Stub,
  };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Icon = () => React.createElement(View, { testID: 'icon' });
  return { Sun: Icon, CloudSun: Icon, Cloud: Icon };
});

import { DailySnapshot } from './DailySnapshot';

const makeIngredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  scientific_name: 'Ascorbic Acid',
  common_name: 'Vitamin C',
  functional_purpose: 'Antioxidant',
  regulatory_context: 'Approved.',
  exposure_context: 'Safe.',
  science_note: 'Antioxidant.',
  literacy_flag: '',
  risk_family: null,
  status: 'safe',
  is_ai_generated: true,
  allergen_info: { is_match: false, alias_detected: null },
  ...overrides,
});

describe('DailySnapshot', () => {
  it('renders without crashing with an empty list', () => {
    render(<DailySnapshot ingredients={[]} />);
    expect(screen.getByText('Scan summary')).toBeTruthy();
  });

  it('renders without crashing with a populated list', () => {
    render(<DailySnapshot ingredients={[makeIngredient(), makeIngredient()]} />);
    expect(screen.getByText('Scan summary')).toBeTruthy();
  });

  it('shows "Mostly clear" headline for all-safe ingredients', () => {
    const ingredients = Array.from({ length: 5 }, () => makeIngredient({ status: 'safe' }));
    render(<DailySnapshot ingredients={ingredients} />);
    expect(screen.getByText('Mostly clear')).toBeTruthy();
  });

  it('shows "Shifting light" headline for high-risk ingredients', () => {
    const ingredients = Array.from({ length: 5 }, () =>
      makeIngredient({ status: 'avoid', allergen_info: { is_match: true, alias_detected: 'Milk' } }),
    );
    render(<DailySnapshot ingredients={ingredients} />);
    expect(screen.getByText('Shifting light')).toBeTruthy();
  });

  it('shows the summary line', () => {
    const ingredients = [makeIngredient({ status: 'safe' }), makeIngredient({ status: 'safe' })];
    render(<DailySnapshot ingredients={ingredients} />);
    expect(screen.getByText(/easygoing/i)).toBeTruthy();
  });

  it('shows the outlook copy hint text', () => {
    render(<DailySnapshot ingredients={[makeIngredient({ status: 'safe' })]} />);
    expect(screen.getByText(/Skies look open/i)).toBeTruthy();
  });

  it('shows the strip label', () => {
    render(<DailySnapshot ingredients={[makeIngredient()]} />);
    expect(screen.getByText(/Ingredients across this scan/i)).toBeTruthy();
  });
});
