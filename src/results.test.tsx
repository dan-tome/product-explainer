import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: () => null },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../src/services/analysisService', () => ({
  analyzeIngredients: jest.fn(),
}));

import { useLocalSearchParams } from 'expo-router';
import { analyzeIngredients } from '../src/services/analysisService';

const mockParams = useLocalSearchParams as jest.Mock;
const mockAnalyze = analyzeIngredients as jest.Mock;

import ResultsScreen from '../app/results';

const MOCK_RESULTS = [
  { name: 'Water', status: 'safe' as const, info: 'Essential.' },
  { name: 'Sugar', status: 'avoid' as const, info: 'High sugar.' },
  { name: 'Maltodextrin', status: 'warning' as const, info: 'Processed starch.' },
  { name: 'Palm Oil', status: 'warning' as const, info: 'Environmental concerns.' },
  { name: 'Salt', status: 'warning' as const, info: 'High intake risk.' },
  { name: 'Citric Acid', status: 'safe' as const, info: 'Natural preservative.' },
  { name: 'Soy Lecithin', status: 'safe' as const, info: 'Emulsifier.' },
];

describe('ResultsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ text: 'Water, Sugar, Maltodextrin, Palm Oil, Salt, Citric Acid, Soy Lecithin' });
    mockAnalyze.mockResolvedValue(MOCK_RESULTS);
  });

  it('shows a loading indicator before analysis completes', () => {
    mockAnalyze.mockReturnValue(new Promise(() => {}));
    render(<ResultsScreen />);
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders without crashing after loading', async () => {
    render(<ResultsScreen />);
    await waitFor(() => expect(screen.queryByTestId('loading-indicator')).toBeNull());
  });

  it('shows the correct total ingredient count after loading', async () => {
    render(<ResultsScreen />);
    await waitFor(() => expect(screen.getByText('7')).toBeTruthy());
  });

  it('renders an ingredient card for each ingredient', async () => {
    render(<ResultsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Water')).toBeTruthy();
      expect(screen.getByText('Sugar')).toBeTruthy();
      expect(screen.getByText('Maltodextrin')).toBeTruthy();
    });
  });

  it('shows empty state when analysis returns no ingredients', async () => {
    mockAnalyze.mockResolvedValue([]);
    render(<ResultsScreen />);
    await waitFor(() =>
      expect(screen.getByText('No ingredients found to analyze.')).toBeTruthy()
    );
  });
});
