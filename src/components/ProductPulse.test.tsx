import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProductPulse } from './ProductPulse';
import { Ingredient, ProductType } from '../types/product';

const makeIngredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  scientific_name: 'Ascorbic Acid',
  common_name: 'Vitamin C',
  functional_purpose: 'Prevents spoilage - Antioxidant',
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

const render_ = (ingredients: Ingredient[], productType: ProductType = 'FOOD') =>
  render(<ProductPulse ingredients={ingredients} productType={productType} />);

describe('ProductPulse — product type card', () => {
  it('shows "Food Product" for FOOD', () => {
    render_([makeIngredient()], 'FOOD');
    expect(screen.getByText('Food Product')).toBeTruthy();
  });

  it('shows "Cosmetic" for COSMETIC', () => {
    render_([makeIngredient()], 'COSMETIC');
    expect(screen.getByText('Cosmetic')).toBeTruthy();
  });

  it('shows "Household" for HOUSEHOLD', () => {
    render_([makeIngredient()], 'HOUSEHOLD');
    expect(screen.getByText('Household')).toBeTruthy();
  });

  it('shows "Product" for UNKNOWN', () => {
    render_([makeIngredient()], 'UNKNOWN');
    expect(screen.getByText('Product')).toBeTruthy();
  });

  it('shows ingredient count', () => {
    render_([makeIngredient(), makeIngredient()], 'FOOD');
    expect(screen.getByText('2 ingredients')).toBeTruthy();
  });
});

describe('ProductPulse — allergen match card', () => {
  it('shows "No Matches" when no allergens detected', () => {
    render_([makeIngredient()]);
    expect(screen.getByText('No Matches')).toBeTruthy();
  });

  it('shows "1 Match" for a single allergen', () => {
    render_([makeIngredient({ allergen_info: { is_match: true, alias_detected: 'Milk' } })]);
    expect(screen.getByText('1 Match')).toBeTruthy();
  });

  it('shows "2 Matches" for two allergens', () => {
    render_([
      makeIngredient({ allergen_info: { is_match: true, alias_detected: 'Milk' } }),
      makeIngredient({ allergen_info: { is_match: true, alias_detected: 'Egg' } }),
    ]);
    expect(screen.getByText('2 Matches')).toBeTruthy();
  });

  it('shows "of N ingredients" sub-label when allergens are present', () => {
    render_([
      makeIngredient({ allergen_info: { is_match: true, alias_detected: 'Milk' } }),
      makeIngredient(),
    ]);
    expect(screen.getByText('of 2 ingredients')).toBeTruthy();
  });

  it('shows "No known allergens detected" sub-label when none present', () => {
    render_([makeIngredient()]);
    expect(screen.getByText('No known allergens detected')).toBeTruthy();
  });
});

describe('ProductPulse — primary ingredient card', () => {
  it('shows common_name of the first ingredient', () => {
    const first = makeIngredient({ common_name: 'Water' });
    const second = makeIngredient({ common_name: 'Salt' });
    render_([first, second]);
    expect(screen.getByText('Water')).toBeTruthy();
  });

  it('shows "—" when ingredients list is empty', () => {
    render_([], 'UNKNOWN');
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('shows functional_purpose of first ingredient as sub-label', () => {
    render_([makeIngredient({ functional_purpose: 'Prevents spoilage - Antioxidant' })]);
    expect(screen.getByText('Prevents spoilage - Antioxidant')).toBeTruthy();
  });
});
