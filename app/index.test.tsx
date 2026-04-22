import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  scanFromURLAsync: jest.fn().mockResolvedValue([]),
  useCameraPermissions: jest.fn(),
}));

jest.mock('../src/hooks/useCameraPermissions', () => ({
  useCameraPermissions: jest.fn(),
}));

jest.mock('../src/services/imageProcessingService', () => ({
  preprocessImageForOCR: jest.fn().mockResolvedValue('processed://uri'),
}));

jest.mock('../src/services/ocrService', () => ({
  extractTextFromImage: jest.fn().mockResolvedValue({ text: 'Water, Glycerin' }),
}));

jest.mock('../src/components/UniversalOcrBridge', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ScanStage: ({ children }: { children: React.ReactNode }) => React.createElement(View, {}, children),
    BridgeHandoff: ({ visible }: { visible: boolean }) =>
      visible ? React.createElement(View, { testID: 'bridge-handoff' }) : null,
  };
});

jest.mock('../src/components/CameraOverlay', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraOverlay: () => React.createElement(View, { testID: 'camera-overlay' }),
    useOverlayLayout: () => ({ layoutW: 390, layoutH: 844, onLayout: jest.fn() }),
  };
});

jest.mock('../src/data/gtinMicroLiteracy', () => ({
  ghostLabelFromBarcodeData: jest.fn().mockReturnValue(null),
}));

jest.mock('../src/dev/cameraTestAssets', () => ({
  getTestBarcodeWipesAssetUri: jest.fn().mockReturnValue('asset://wipes.jpg'),
  getTestBarcodeWipesImageSize: jest.fn().mockReturnValue({ width: 1080, height: 1920 }),
  getTestIngredientsOcrAssetUri: jest.fn().mockReturnValue('asset://ingredients.jpg'),
  mapBarcodeBoundsToOverlay: jest.fn().mockReturnValue({ origin: { x: 0, y: 0 }, size: { width: 100, height: 40 } }),
  syntheticWipesBarcodeBounds: jest.fn().mockReturnValue({ origin: { x: 0, y: 0 }, size: { width: 100, height: 40 } }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Icon = ({ testID }: { testID?: string }) => React.createElement(View, { testID });
  return { Camera: Icon, FlipHorizontal: Icon };
});

import { useCameraPermissions } from '../src/hooks/useCameraPermissions';
import CameraScreen from './index';

const mockUseCameraPermissions = useCameraPermissions as jest.Mock;

describe.skip('CameraScreen (app/index.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('permission states', () => {
    it('shows a loading spinner while permission is being resolved (isGranted=null)', () => {
      mockUseCameraPermissions.mockReturnValue({ isGranted: null, requestPermission: jest.fn() });
      render(<CameraScreen />);
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('shows the permission request UI when isGranted=false', () => {
      mockUseCameraPermissions.mockReturnValue({ isGranted: false, requestPermission: jest.fn() });
      render(<CameraScreen />);
      expect(screen.getByText(/permission/i)).toBeTruthy();
      expect(screen.getByText('Grant Permission')).toBeTruthy();
    });

    it('calls requestPermission when Grant Permission is tapped', () => {
      const requestPermission = jest.fn();
      mockUseCameraPermissions.mockReturnValue({ isGranted: false, requestPermission });
      render(<CameraScreen />);
      fireEvent.press(screen.getByText('Grant Permission'));
      expect(requestPermission).toHaveBeenCalled();
    });

    it('renders the live camera view when isGranted=true', () => {
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
      expect(screen.getByTestId('camera-overlay')).toBeTruthy();
    });
  });

  describe('barcode scanning', () => {
    it('fires haptic feedback when a barcode is scanned', async () => {
      const Haptics = require('expo-haptics');
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
      // TODO: simulate onBarcodeScanned callback via CameraView mock
      // expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('throttles barcode events to at most one per BARCODE_THROTTLE_MS', async () => {
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
      // TODO: simulate two rapid barcode events and assert only one haptic fires
    });

    it('transitions viewfinder state to barcode_lock on successful scan', async () => {
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
      // TODO: assert CameraOverlay receives state="barcode_lock" after scan event
    });

    it('clears barcode_lock state after 4500ms', async () => {
      jest.useFakeTimers();
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
      // TODO: trigger barcode_lock then advance timers by 4500ms
      // assert state returns to passive_search
      jest.useRealTimers();
    });
  });

  describe('OCR capture', () => {
    it('disables the capture button while scanning is in progress', async () => {
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
      // TODO: trigger takePicture, assert capture button has disabled prop
    });

    it('shows BridgeHandoff overlay after successful OCR', async () => {
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
      // TODO: trigger takePicture through mock CameraView ref
      // await act(async () => { ... })
      // expect(screen.getByTestId('bridge-handoff')).toBeTruthy();
    });

    it('navigates to /results with extracted OCR text', async () => {
      const router = require('expo-router').useRouter();
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
      // TODO: trigger full capture → OCR → handoff → router.push flow
      // expect(router.push).toHaveBeenCalledWith({ pathname: '/results', params: { text: 'Water, Glycerin' } });
    });

    it('resets scanning state after navigation', async () => {
      jest.useFakeTimers();
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
      // TODO: complete capture flow, advance timers past 440ms handoff delay
      // assert isScanning returns to false and viewfinder back to passive_search
      jest.useRealTimers();
    });
  });

  describe('camera controls', () => {
    it('toggles facing between back and front when flip button is pressed', () => {
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
      // TODO: press flip button, assert CameraView receives facing="front"
      // press again, assert facing="back"
    });
  });
});
