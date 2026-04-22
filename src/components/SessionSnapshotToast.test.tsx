import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SessionSnapshotToast } from './SessionSnapshotToast';

describe.skip('SessionSnapshotToast', () => {
  it('renders without crashing', () => {
    render(<SessionSnapshotToast />);
  });

  it('shows the "Session snapshot" kicker label', () => {
    render(<SessionSnapshotToast />);
    expect(screen.getByText('Session snapshot')).toBeTruthy();
  });

  it('shows the body copy connecting ingredient to the broader scan', () => {
    render(<SessionSnapshotToast />);
    expect(screen.getByText(/running picture/i)).toBeTruthy();
  });

  it('has an accessibility label describing its purpose', () => {
    render(<SessionSnapshotToast />);
    expect(
      screen.getByLabelText(/session snapshot/i),
    ).toBeTruthy();
  });
});
