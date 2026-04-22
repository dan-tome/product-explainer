import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Icon = () => React.createElement(View, { testID: 'icon' });
  return { Sparkles: Icon };
});

import { DiscoveryHero } from './DiscoveryHero';

describe.skip('DiscoveryHero', () => {
  it('renders for UNKNOWN product type with ingredients present', () => {
    render(<DiscoveryHero productType="UNKNOWN" ingredientCount={3} />);
    expect(screen.getByText('First light on this label')).toBeTruthy();
  });

  it('renders null when productType is not UNKNOWN', () => {
    const { toJSON } = render(<DiscoveryHero productType="FOOD" ingredientCount={3} />);
    expect(toJSON()).toBeNull();
  });

  it('renders null when productType is COSMETIC', () => {
    const { toJSON } = render(<DiscoveryHero productType="COSMETIC" ingredientCount={2} />);
    expect(toJSON()).toBeNull();
  });

  it('renders null when productType is HOUSEHOLD', () => {
    const { toJSON } = render(<DiscoveryHero productType="HOUSEHOLD" ingredientCount={1} />);
    expect(toJSON()).toBeNull();
  });

  it('renders null when ingredientCount is 0, even for UNKNOWN type', () => {
    // Zero ingredients = no read at all, hero would be misleading
    const { toJSON } = render(<DiscoveryHero productType="UNKNOWN" ingredientCount={0} />);
    expect(toJSON()).toBeNull();
  });

  it('shows the framing body copy', () => {
    render(<DiscoveryHero productType="UNKNOWN" ingredientCount={1} />);
    expect(screen.getByText(/opening read, not a verdict/i)).toBeTruthy();
  });

  it('has accessible role of text', () => {
    render(<DiscoveryHero productType="UNKNOWN" ingredientCount={2} />);
    // accessibilityRole="text" is on the outer View
    expect(screen.getByRole('text')).toBeTruthy();
  });

  it('renders the sparkles icon', () => {
    render(<DiscoveryHero productType="UNKNOWN" ingredientCount={1} />);
    expect(screen.getByTestId('icon')).toBeTruthy();
  });
});
