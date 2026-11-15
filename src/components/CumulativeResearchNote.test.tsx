import React from 'react';
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

import { CumulativeResearchNote } from './CumulativeResearchNote';
import type { CumulativeResearchNote as NoteModel } from '../types/universalBridge';

const makeNote = (overrides: Partial<NoteModel> = {}): NoteModel => ({
  title: 'Thyroid + estrogen pathways active',
  body: 'Two independent disruption pathways detected across this scan.',
  ...overrides,
});

describe('CumulativeResearchNote', () => {
  it('shows the "Aggregate signal" kicker', () => {
    render(<CumulativeResearchNote note={makeNote()} />);
    expect(screen.getByText('Aggregate signal')).toBeTruthy();
  });

  it('renders the note title', () => {
    render(
      <CumulativeResearchNote note={makeNote({ title: 'Thyroid + estrogen pathways active' })} />,
    );
    expect(screen.getByText('Thyroid + estrogen pathways active')).toBeTruthy();
  });

  it('renders the note body', () => {
    render(
      <CumulativeResearchNote
        note={makeNote({ body: 'Two independent disruption pathways detected across this scan.' })}
      />,
    );
    expect(
      screen.getByText('Two independent disruption pathways detected across this scan.'),
    ).toBeTruthy();
  });

  it('updates displayed text when the note prop changes', () => {
    const { rerender } = render(
      <CumulativeResearchNote note={makeNote({ title: 'First title' })} />,
    );
    expect(screen.getByText('First title')).toBeTruthy();

    rerender(<CumulativeResearchNote note={makeNote({ title: 'Updated title' })} />);
    expect(screen.getByText('Updated title')).toBeTruthy();
  });

  it('does not render the SVG border before layout fires (zero size guard)', () => {
    render(<CumulativeResearchNote note={makeNote()} />);
    expect(screen.queryByTestId('hairline-svg')).toBeNull();
  });

  it('renders the SVG border after layout provides real dimensions', () => {
    render(<CumulativeResearchNote note={makeNote()} />);
    fireEvent(screen.getByText(makeNote().title), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 100 } },
    });
    const svg = screen.getByTestId('hairline-svg');
    expect(svg.props.width).toBe(300);
    expect(svg.props.height).toBe(100);
  });
});
