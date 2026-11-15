import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const animResult = { finished: true };
  RN.Animated.timing = () => ({ start: (cb?: (r: typeof animResult) => void) => cb?.(animResult) });
  RN.Animated.sequence = () => ({
    start: (cb?: (r: typeof animResult) => void) => cb?.(animResult),
  });
  RN.Animated.loop = () => ({ start: jest.fn() });
  return RN;
});

import { SkeletonLoader } from './SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders without crashing', () => {
    expect(() => render(<SkeletonLoader />)).not.toThrow();
  });

  it('renders three pulse cards (hero + two standard)', () => {
    render(<SkeletonLoader />);
    expect(
      screen.getAllByTestId('skeleton-pulse-card', { includeHiddenElements: true }),
    ).toHaveLength(3);
  });

  it('renders six placeholder ingredient cards', () => {
    render(<SkeletonLoader />);
    expect(
      screen.getAllByTestId('skeleton-ingredient-card', { includeHiddenElements: true }),
    ).toHaveLength(6);
  });

  it('announces loading to screen readers', () => {
    render(<SkeletonLoader />);
    expect(screen.getByLabelText('Analysing ingredients')).toBeTruthy();
  });
});
