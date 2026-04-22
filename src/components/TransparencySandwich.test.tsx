import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = (props: { accessibilityLabel?: string; children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: props.accessibilityLabel }, props.children);
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Circle: Stub,
    Line: Stub,
    Path: Stub,
  };
});

import { TransparencySandwich, MagnifyingGlassSvg, VentilationSvg } from './TransparencySandwich';

describe.skip('TransparencySandwich', () => {
  it('renders without crashing with showVentilation=false', () => {
    render(
      <TransparencySandwich showVentilation={false}>
        <Text>Content</Text>
      </TransparencySandwich>,
    );
  });

  it('renders children in the center slot', () => {
    render(
      <TransparencySandwich showVentilation={false}>
        <Text>Disclosure text</Text>
      </TransparencySandwich>,
    );
    expect(screen.getByText('Disclosure text')).toBeTruthy();
  });

  it('shows the magnifying glass (scientific scrutiny) icon always', () => {
    render(
      <TransparencySandwich showVentilation={false}>
        <Text>Content</Text>
      </TransparencySandwich>,
    );
    expect(screen.getByLabelText('Scientific scrutiny')).toBeTruthy();
  });

  it('shows the ventilation icon when showVentilation=true', () => {
    render(
      <TransparencySandwich showVentilation>
        <Text>Content</Text>
      </TransparencySandwich>,
    );
    expect(screen.getByLabelText('Ventilation advisory')).toBeTruthy();
  });

  it('does not show the ventilation icon when showVentilation=false', () => {
    render(
      <TransparencySandwich showVentilation={false}>
        <Text>Content</Text>
      </TransparencySandwich>,
    );
    expect(screen.queryByLabelText('Ventilation advisory')).toBeNull();
  });
});

describe.skip('MagnifyingGlassSvg', () => {
  it('renders without crashing', () => {
    render(<MagnifyingGlassSvg />);
  });

  it('has the scientific scrutiny accessibility label', () => {
    render(<MagnifyingGlassSvg />);
    expect(screen.getByLabelText('Scientific scrutiny')).toBeTruthy();
  });
});

describe.skip('VentilationSvg', () => {
  it('renders without crashing', () => {
    render(<VentilationSvg />);
  });

  it('has the ventilation advisory accessibility label', () => {
    render(<VentilationSvg />);
    expect(screen.getByLabelText('Ventilation advisory')).toBeTruthy();
  });
});
