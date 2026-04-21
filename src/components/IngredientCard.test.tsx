import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { IngredientCard } from './IngredientCard';

describe('IngredientCard', () => {
  it('renders the ingredient name', () => {
    render(<IngredientCard ingredient={{ name: 'sugar', status: 'avoid', info: 'Unhealthy' }} onPress={() => {}} />);
    expect(screen.getByText('Sugar')).toBeTruthy();
  });

  it('renders the status badge label', () => {
    render(<IngredientCard ingredient={{ name: 'water', status: 'safe', info: 'Essential for life.' }} onPress={() => {}} />);
    expect(screen.getByText('Safe')).toBeTruthy();
  });

  it('renders for each status without crashing', () => {
    const statuses = ['safe', 'warning', 'avoid', 'unknown'] as const;
    statuses.forEach(status => {
      const { unmount } = render(
        <IngredientCard ingredient={{ name: 'test', status, info: 'info' }} onPress={() => {}} />
      );
      unmount();
    });
  });

  it('capitalises the first letter of the ingredient name', () => {
    render(<IngredientCard ingredient={{ name: 'citric acid', status: 'safe', info: 'info' }} onPress={() => {}} />);
    expect(screen.getByText('Citric acid')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<IngredientCard ingredient={{ name: 'salt', status: 'warning', info: 'info' }} onPress={onPress} />);
    fireEvent.press(screen.getByText('Salt'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
