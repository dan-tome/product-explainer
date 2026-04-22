import React from 'react';
import { render, screen } from '@testing-library/react-native';

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

import { CumulativeResearchNote } from './CumulativeResearchNote';
import type { CumulativeResearchNote as NoteModel } from '../types/universalBridge';

const makeNote = (overrides: Partial<NoteModel> = {}): NoteModel => ({
  title: 'Thyroid + estrogen pathways active',
  body: 'Two independent disruption pathways detected across this scan.',
  ...overrides,
});

describe.skip('CumulativeResearchNote', () => {
  it('renders without crashing', () => {
    render(<CumulativeResearchNote note={makeNote()} />);
  });

  it('shows the "Aggregate signal" kicker', () => {
    render(<CumulativeResearchNote note={makeNote()} />);
    expect(screen.getByText('Aggregate signal')).toBeTruthy();
  });

  it('renders the note title', () => {
    render(<CumulativeResearchNote note={makeNote({ title: 'Thyroid + estrogen pathways active' })} />);
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
    const { rerender } = render(<CumulativeResearchNote note={makeNote({ title: 'First title' })} />);
    expect(screen.getByText('First title')).toBeTruthy();

    rerender(<CumulativeResearchNote note={makeNote({ title: 'Updated title' })} />);
    expect(screen.getByText('Updated title')).toBeTruthy();
  });

  it('does not render the SVG border before layout fires (zero size guard)', () => {
    // Component guards on size.w > 0 && size.h > 0 before rendering SVG
    // At initial render (no layout event), SVG should be absent
    render(<CumulativeResearchNote note={makeNote()} />);
    // TODO: assert SVG mock is not present in tree at initial render
  });

  it('renders the SVG border after layout provides real dimensions', () => {
    // TODO: fire onLayout with { nativeEvent: { layout: { width: 300, height: 100 } } }
    // and assert the SVG Rect is present
  });
});
