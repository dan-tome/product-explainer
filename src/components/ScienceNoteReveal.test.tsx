import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = (_value: unknown, _config: unknown) => ({
    start: (cb?: () => void) => cb?.(),
    stop: jest.fn(),
    reset: jest.fn(),
  });
  RN.Animated.stagger = (_delay: number, animations: unknown[]) => ({
    start: (cb?: () => void) => {
      animations.forEach((a: any) => a.start?.());
      cb?.();
    },
    stop: jest.fn(),
    reset: jest.fn(),
  });
  return RN;
});

jest.mock('../styles/motion', () => ({
  MOTION: {
    standardRevealMs: 200,
    hydrateStaggerMs: 72,
    easingStandard: (t: number) => t,
  },
}));

import { ScienceNoteReveal } from './ScienceNoteReveal';
import type { ValidatedFamilySignal } from '../types/universalBridge';

const makeSignal = (overrides: Partial<ValidatedFamilySignal> = {}): ValidatedFamilySignal => ({
  familyId: 'thyroid',
  label: 'Thyroid pathway',
  ...overrides,
});

describe.skip('ScienceNoteReveal', () => {
  it('renders without crashing', () => {
    render(<ScienceNoteReveal signal={makeSignal()} />);
  });

  it('shows the "Science note" kicker', () => {
    render(<ScienceNoteReveal signal={makeSignal()} />);
    expect(screen.getByText('Science note')).toBeTruthy();
  });

  it('renders the signal label', () => {
    render(<ScienceNoteReveal signal={makeSignal({ label: 'Thyroid pathway' })} />);
    expect(screen.getByText('Thyroid pathway')).toBeTruthy();
  });

  it('renders the detail line when signal.detail is provided', () => {
    render(
      <ScienceNoteReveal
        signal={makeSignal({ detail: 'Disrupts iodine uptake at the thyroid gland.' })}
      />,
    );
    expect(screen.getByText('Disrupts iodine uptake at the thyroid gland.')).toBeTruthy();
  });

  it('does not render a detail element when signal.detail is absent', () => {
    render(<ScienceNoteReveal signal={makeSignal()} />);
    // No detail prop — third animated line should not be in the tree
    expect(screen.queryByText(/Disrupts/i)).toBeNull();
  });

  it('has accessible role of text on the wrapper', () => {
    render(<ScienceNoteReveal signal={makeSignal()} />);
    expect(screen.getByRole('text')).toBeTruthy();
  });

  it('starts animations on mount', () => {
    // Smoke test: no error thrown during animation sequence startup
    expect(() => render(<ScienceNoteReveal signal={makeSignal()} />)).not.toThrow();
  });

  it('re-runs animations when signal.familyId changes', () => {
    const { rerender } = render(<ScienceNoteReveal signal={makeSignal({ familyId: 'thyroid' })} />);
    // Should not throw when signal identity changes (new product scan)
    expect(() =>
      rerender(<ScienceNoteReveal signal={makeSignal({ familyId: 'estrogen', label: 'Estrogen pathway' })} />),
    ).not.toThrow();
    expect(screen.getByText('Estrogen pathway')).toBeTruthy();
  });
});
