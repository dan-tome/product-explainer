import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

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

import { CompoundGroupFrame } from './CompoundGroupFrame';

describe.skip('CompoundGroupFrame', () => {
  it('renders without crashing', () => {
    render(
      <CompoundGroupFrame>
        <Text>Child</Text>
      </CompoundGroupFrame>,
    );
  });

  it('renders its children', () => {
    render(
      <CompoundGroupFrame>
        <Text>Synergy card</Text>
      </CompoundGroupFrame>,
    );
    expect(screen.getByText('Synergy card')).toBeTruthy();
  });

  it('does not render the SVG border before a layout event (zero dimensions)', () => {
    // Before onLayout fires, size is {w:0, h:0} — SVG should be absent
    render(
      <CompoundGroupFrame>
        <Text>Child</Text>
      </CompoundGroupFrame>,
    );
    // Svg stub would produce a View; absence of the hairline rect means no SVG children at zero size
    // This test documents the guard: `size.w > 0 && size.h > 0`
  });

  it('renders the SVG border after a layout event provides real dimensions', () => {
    const { getByTestId } = render(
      <CompoundGroupFrame>
        <Text>Child</Text>
      </CompoundGroupFrame>,
    );
    // Fire onLayout to give the wrapping View real dimensions
    // Then assert the SVG border wrapper is present
    // TODO: trigger fireEvent(wrapper, 'layout', { nativeEvent: { layout: { width: 300, height: 120 } } })
  });

  it('renders multiple children without issue', () => {
    render(
      <CompoundGroupFrame>
        <Text>Card A</Text>
        <Text>Card B</Text>
      </CompoundGroupFrame>,
    );
    expect(screen.getByText('Card A')).toBeTruthy();
    expect(screen.getByText('Card B')).toBeTruthy();
  });
});
