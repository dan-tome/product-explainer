import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { DISCLAIMER_TITLE, MedicalDisclaimer } from './MedicalDisclaimer';

describe('MedicalDisclaimer', () => {
  it('states plainly that results are not medical advice', () => {
    render(<MedicalDisclaimer />);
    expect(screen.getByText(DISCLAIMER_TITLE)).toBeTruthy();
    expect(screen.getByText(/AI-generated explanations can be wrong/)).toBeTruthy();
  });

  it('points people to a professional for allergies and health concerns', () => {
    render(<MedicalDisclaimer />);
    expect(screen.getByText(/pharmacist, doctor or allergist/)).toBeTruthy();
  });

  it('is read by screen readers as one announcement', () => {
    render(<MedicalDisclaimer />);
    expect(screen.getByLabelText(/^For learning, not medical advice\./)).toBeTruthy();
  });
});
