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
  detectProductType: jest.fn(() => 'FOOD'),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

import { useLocalSearchParams } from 'expo-router';
import { analyzeIngredients, detectProductType } from '../src/services/analysisService';
import { Ingredient } from '../src/types/product';

const mockParams = useLocalSearchParams as jest.Mock;
const mockAnalyze = analyzeIngredients as jest.Mock;
const mockDetectProductType = detectProductType as jest.Mock;

import ResultsScreen from '../app/results';

const makeIngredient = (common_name: string, status: Ingredient['status'] = 'safe'): Ingredient => ({
  scientific_name: common_name,
  common_name,
  functional_purpose: `Provides ${common_name} benefit - Function`,
  regulatory_context: 'Approved.',
  exposure_context: 'Safe for intended use.',
  science_note: 'No specific note.',
  literacy_flag: '',
  risk_family: null,
  status,
  is_ai_generated: true,
  allergen_info: { is_match: false, alias_detected: null },
});

const MOCK_RESULTS: Ingredient[] = [
  makeIngredient('Water', 'safe'),
  makeIngredient('Sugar', 'avoid'),
  makeIngredient('Maltodextrin', 'warning'),
  makeIngredient('Palm Oil', 'warning'),
  makeIngredient('Salt', 'warning'),
  makeIngredient('Citric Acid', 'safe'),
  makeIngredient('Soy Lecithin', 'safe'),
];

describe('ResultsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ text: 'Water, Sugar, Maltodextrin, Palm Oil, Salt, Citric Acid, Soy Lecithin' });
    mockAnalyze.mockResolvedValue(MOCK_RESULTS);
    mockDetectProductType.mockReturnValue('FOOD');
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

  it('shows ingredient count in ProductPulse after loading', async () => {
    render(<ResultsScreen />);
    await waitFor(() => expect(screen.getByText('7 ingredients')).toBeTruthy());
  });

  it('renders an ingredient card for each ingredient', async () => {
    render(<ResultsScreen />);
    // common_name and scientific_name are both in the tree (collapsed + hidden expanded section)
    await waitFor(() => {
      expect(screen.getAllByText('Water').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Sugar').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Maltodextrin').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows empty state when analysis returns no ingredients', async () => {
    mockAnalyze.mockResolvedValue([]);
    render(<ResultsScreen />);
    await waitFor(() =>
      expect(screen.getByText(/surface ingredients this pass/i)).toBeTruthy(),
    );
  });

  it('fires selection haptic when First Light slate applies (UNKNOWN + ingredients)', async () => {
    const Haptics = require('expo-haptics');
    mockDetectProductType.mockReturnValue('UNKNOWN');
    mockAnalyze.mockResolvedValue([makeIngredient('Water')]);
    render(<ResultsScreen />);
    await waitFor(() => expect(Haptics.selectionAsync).toHaveBeenCalled());
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('fires success notification haptic when product type is known', async () => {
    const Haptics = require('expo-haptics');
    mockDetectProductType.mockReturnValue('FOOD');
    render(<ResultsScreen />);
    await waitFor(() => expect(Haptics.notificationAsync).toHaveBeenCalled());
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});
