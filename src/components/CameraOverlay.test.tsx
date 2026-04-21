import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { act } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const animResult = { finished: true };
  RN.Animated.timing = () => ({ start: (cb?: (r: typeof animResult) => void) => cb?.(animResult) });
  RN.Animated.spring = () => ({ start: (cb?: (r: typeof animResult) => void) => cb?.(animResult) });
  RN.Animated.loop = () => ({ start: jest.fn() });
  RN.Animated.sequence = () => ({ start: (cb?: (r: typeof animResult) => void) => cb?.(animResult) });
  return RN;
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = ({ children }: { children?: React.ReactNode }) => React.createElement(View, {}, children);
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Defs: Stub,
    Rect: Stub,
    Stop: Stub,
    LinearGradient: Stub,
    RadialGradient: Stub,
    SvgLinearGradient: Stub,
  };
});

import { CameraOverlay, useOverlayLayout } from './CameraOverlay';
import { renderHook } from '@testing-library/react-native';

const defaultProps = {
  state: 'passive_search' as const,
  layoutW: 375,
  layoutH: 812,
  barcodeBounds: null,
  ghostLabel: null,
};

describe('CameraOverlay', () => {
  it('returns null when layoutW is 0', () => {
    const { toJSON } = render(<CameraOverlay {...defaultProps} layoutW={0} />);
    expect(toJSON()).toBeNull();
  });

  it('returns null when layoutH is 0', () => {
    const { toJSON } = render(<CameraOverlay {...defaultProps} layoutH={0} />);
    expect(toJSON()).toBeNull();
  });

  it('renders without crashing in passive_search state with valid dimensions', () => {
    expect(() => render(<CameraOverlay {...defaultProps} />)).not.toThrow();
  });

  it('renders without crashing in barcode_lock state', () => {
    expect(() =>
      render(<CameraOverlay {...defaultProps} state="barcode_lock" />),
    ).not.toThrow();
  });

  it('renders without crashing in ocr_synthesis state', () => {
    expect(() =>
      render(<CameraOverlay {...defaultProps} state="ocr_synthesis" />),
    ).not.toThrow();
  });

  it('renders without crashing in handoff state', () => {
    expect(() =>
      render(<CameraOverlay {...defaultProps} state="handoff" />),
    ).not.toThrow();
  });

  it('shows ghost pill label when state is barcode_lock and ghostLabel is set', () => {
    render(
      <CameraOverlay
        {...defaultProps}
        state="barcode_lock"
        ghostLabel="Household Wipes"
        barcodeBounds={{ origin: { x: 100, y: 200 }, size: { width: 120, height: 60 } }}
      />,
    );
    expect(screen.getByText('Household Wipes')).toBeTruthy();
  });

  it('does not show ghost pill when state is passive_search', () => {
    render(<CameraOverlay {...defaultProps} state="passive_search" ghostLabel="Household Wipes" />);
    expect(screen.queryByText('Household Wipes')).toBeNull();
  });

  it('does not show ghost pill when ghostLabel is null in barcode_lock', () => {
    render(<CameraOverlay {...defaultProps} state="barcode_lock" ghostLabel={null} />);
    // Should render without crash and no ghost pill text
    expect(screen.queryByText(/Wipes/)).toBeNull();
  });
});

describe('useOverlayLayout', () => {
  it('initialises with zero dimensions', () => {
    const { result } = renderHook(() => useOverlayLayout());
    expect(result.current.layoutW).toBe(0);
    expect(result.current.layoutH).toBe(0);
  });

  it('updates dimensions when onLayout is called', () => {
    const { result } = renderHook(() => useOverlayLayout());
    act(() => {
      result.current.onLayout({
        nativeEvent: { layout: { width: 390, height: 844, x: 0, y: 0 } },
      } as any);
    });
    expect(result.current.layoutW).toBe(390);
    expect(result.current.layoutH).toBe(844);
  });
});
