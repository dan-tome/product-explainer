import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({ back: jest.fn() })),
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
    // Positive presence check is more reliable than absence check in React 19 concurrent mode
    await waitFor(() => expect(screen.getByText('7 ingredients')).toBeTruthy());
    expect(screen.queryByTestId('loading-indicator')).toBeNull();
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
      expect(screen.getByText(/nothing found this pass/i)).toBeTruthy(),
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

describe.skip('ResultsScreen — translation toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ text: 'Water, Glycerin' });
    mockAnalyze.mockResolvedValue([makeIngredient('Water'), makeIngredient('Glycerin')]);
    mockDetectProductType.mockReturnValue('FOOD');
  });

  it('shows the Common / INCI toggle when there are ingredients', async () => {
    render(<ResultsScreen />);
    await waitFor(() => expect(screen.getByText('Common')).toBeTruthy());
    expect(screen.getByText('INCI')).toBeTruthy();
  });

  it('defaults to Common mode (showScientific=false)', async () => {
    render(<ResultsScreen />);
    await waitFor(() => {
      const common = screen.getByText('Common');
      expect(common.props.accessibilityState?.selected ?? common.props.style).toBeTruthy();
    });
  });

  it('switches to INCI mode when INCI button is pressed', async () => {
    const { fireEvent: fe } = require('@testing-library/react-native');
    render(<ResultsScreen />);
    await waitFor(() => screen.getByText('INCI'));
    fe.press(screen.getByText('INCI'));
    // After press, each IngredientCard receives showScientific=true
    // TODO: assert IngredientCard prop or accessibility state on the INCI button
  });

  it('switches back to Common mode when Common button is pressed from INCI', async () => {
    const { fireEvent: fe } = require('@testing-library/react-native');
    render(<ResultsScreen />);
    await waitFor(() => screen.getByText('Common'));
    fe.press(screen.getByText('INCI'));
    fe.press(screen.getByText('Common'));
    // TODO: assert showScientific=false propagated to IngredientCard
  });

  it('does not render the toggle when ingredient list is empty', async () => {
    mockAnalyze.mockResolvedValue([]);
    render(<ResultsScreen />);
    await waitFor(() => screen.getByText(/nothing found this pass/i));
    expect(screen.queryByText('Common')).toBeNull();
    expect(screen.queryByText('INCI')).toBeNull();
  });
});

describe.skip('ResultsScreen — empty state UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ text: 'gibberish no ingredients here' });
    mockAnalyze.mockResolvedValue([]);
    mockDetectProductType.mockReturnValue('UNKNOWN');
  });

  it('shows the "Scan again" button in the empty state', async () => {
    render(<ResultsScreen />);
    await waitFor(() => expect(screen.getByText('Scan again')).toBeTruthy());
  });

  it('calls router.back() when Scan again is pressed', async () => {
    const { useRouter } = require('expo-router');
    const router = useRouter();
    render(<ResultsScreen />);
    await waitFor(() => screen.getByText('Scan again'));
    const { fireEvent: fe } = require('@testing-library/react-native');
    fe.press(screen.getByText('Scan again'));
    expect(router.back).toHaveBeenCalled();
  });

  it('shows instructional copy about holding camera closer', async () => {
    render(<ResultsScreen />);
    await waitFor(() => expect(screen.getByText(/closer to the ingredients/i)).toBeTruthy());
  });
});

describe('ResultsScreen — analysis error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ text: 'Water, Glycerin' });
    mockDetectProductType.mockReturnValue('FOOD');
  });

  it('does not crash when analyzeIngredients rejects', async () => {
    mockAnalyze.mockRejectedValue(new Error('Network error'));
    expect(() => render(<ResultsScreen />)).not.toThrow();
  });

  it('exits the loading state when analysis rejects', async () => {
    mockAnalyze.mockRejectedValue(new Error('Gemini timeout'));
    render(<ResultsScreen />);
    await waitFor(() => expect(screen.getByText('Scan again')).toBeTruthy());
  });

  it('shows the empty state when analysis rejects', async () => {
    mockAnalyze.mockRejectedValue(new Error('Gemini timeout'));
    render(<ResultsScreen />);
    await waitFor(() => expect(screen.getByText(/nothing found this pass/i)).toBeTruthy());
  });
});

describe.skip('ResultsScreen — synergy / compound group', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ text: 'Resorcinol, Oxybenzone, Water' });
    mockDetectProductType.mockReturnValue('COSMETIC');
  });

  it('passes compoundGroup=true to IngredientCard when synergy is active', async () => {
    mockAnalyze.mockResolvedValue([
      makeIngredient('Resorcinol', 'warning'),
      makeIngredient('Oxybenzone', 'warning'),
      makeIngredient('Water'),
    ]);
    render(<ResultsScreen />);
    await waitFor(() => screen.getByText('Resorcinol'));
    // TODO: assert CompoundGroupFrame wraps synergy-pair cards
    // (requires either a testID on CompoundGroupFrame or checking the IngredientCard prop)
  });

  it('does not activate compound group when only one pathway ingredient is present', async () => {
    mockAnalyze.mockResolvedValue([makeIngredient('Resorcinol', 'warning'), makeIngredient('Water')]);
    render(<ResultsScreen />);
    await waitFor(() => screen.getByText('Resorcinol'));
    // TODO: assert compoundGroup=false on all IngredientCards
  });
});
