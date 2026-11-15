import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, {}, children);
  const Svg = ({
    children,
    width,
    height,
  }: {
    children?: React.ReactNode;
    width: number;
    height: number;
  }) => React.createElement(View, { testID: 'hairline-svg', width, height }, children);
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Defs: Stub,
    LinearGradient: Stub,
    Rect: Stub,
    Stop: Stub,
  };
});

import { CompoundGroupFrame } from './CompoundGroupFrame';

describe('CompoundGroupFrame', () => {
  it('renders its children', () => {
    render(
      <CompoundGroupFrame>
        <Text>Synergy card</Text>
      </CompoundGroupFrame>,
    );
    expect(screen.getByText('Synergy card')).toBeTruthy();
  });

  it('does not render the SVG border before a layout event (zero dimensions)', () => {
    render(
      <CompoundGroupFrame>
        <Text>Child</Text>
      </CompoundGroupFrame>,
    );
    expect(screen.queryByTestId('hairline-svg')).toBeNull();
  });

  it('renders the SVG border sized to the layout once dimensions are known', () => {
    render(
      <CompoundGroupFrame>
        <Text>Child</Text>
      </CompoundGroupFrame>,
    );
    // layout bubbles up to the wrapper's onLayout handler
    fireEvent(screen.getByText('Child'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 120 } },
    });
    const svg = screen.getByTestId('hairline-svg');
    expect(svg.props.width).toBe(300);
    expect(svg.props.height).toBe(120);
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
