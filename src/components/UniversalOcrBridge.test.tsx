import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const animResult = { finished: true };
  RN.Animated.timing = () => ({ start: (cb?: (r: typeof animResult) => void) => cb?.(animResult) });
  RN.Animated.parallel = () => ({ start: (cb?: (r: typeof animResult) => void) => cb?.(animResult) });
  return RN;
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./CumulativeResearchNote', () => ({
  CumulativeResearchNote: () => null,
}));

jest.mock('./DiscoveryHero', () => ({
  DiscoveryHero: () => null,
}));

jest.mock('./ScienceNoteReveal', () => ({
  ScienceNoteReveal: () => null,
}));

import { ScanStage, BridgeHandoff, ResearchSlateContainer } from './UniversalOcrBridge';

describe('ScanStage', () => {
  it('renders header kicker text', () => {
    render(<ScanStage><></></ScanStage>);
    expect(screen.getByText('Universal interpreter')).toBeTruthy();
  });

  it('renders header title text', () => {
    render(<ScanStage><></></ScanStage>);
    expect(screen.getByText('Bridge from label to research')).toBeTruthy();
  });

  it('renders children', () => {
    render(<ScanStage><></></ScanStage>);
    // no crash = children slot accepted
  });
});

describe('BridgeHandoff', () => {
  it('renders nothing when visible is false', () => {
    render(<BridgeHandoff visible={false} />);
    expect(screen.queryByText('Label captured')).toBeNull();
  });

  it('renders content when visible is true', () => {
    render(<BridgeHandoff visible={true} />);
    expect(screen.getByText('Label captured')).toBeTruthy();
  });

  it('shows the handoff title', () => {
    render(<BridgeHandoff visible={true} />);
    expect(screen.getByText('Opening your research slate…')).toBeTruthy();
  });

  it('shows the reassurance subtitle', () => {
    render(<BridgeHandoff visible={true} />);
    expect(screen.getByText('A quiet handoff — not a system fault.')).toBeTruthy();
  });
});

describe('ResearchSlateContainer', () => {
  it('does not render the removed top kicker (chrome is in DiscoveryHero)', () => {
    render(
      <ResearchSlateContainer productType="FOOD" ingredientCount={3}>
        <></>
      </ResearchSlateContainer>,
    );
    expect(screen.queryByText('Research slate')).toBeNull();
  });

  it('renders children', () => {
    render(
      <ResearchSlateContainer productType="FOOD" ingredientCount={3}>
        <></>
      </ResearchSlateContainer>,
    );
    // no crash = slot accepted
  });

  it('renders without crashing for all product types', () => {
    (['FOOD', 'COSMETIC', 'HOUSEHOLD', 'UNKNOWN'] as const).forEach(pt => {
      const { unmount } = render(
        <ResearchSlateContainer productType={pt} ingredientCount={5}>
          <></>
        </ResearchSlateContainer>,
      );
      unmount();
    });
  });
});
