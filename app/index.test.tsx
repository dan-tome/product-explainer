import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockOverlay = { state: '' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

// CameraView stand-in: records the latest props and exposes takePictureAsync on its ref,
// so tests can fire barcode events and drive the shutter like the real component.
const mockCamera = {
  props: {} as Record<string, any>,
  takePictureAsync: jest.fn(),
};
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const CameraView = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    mockCamera.props = props;
    React.useImperativeHandle(ref, () => ({ takePictureAsync: mockCamera.takePictureAsync }));
    return React.createElement(View, { testID: 'camera-view' });
  });
  CameraView.displayName = 'CameraView';
  return {
    CameraView,
    scanFromURLAsync: jest.fn().mockResolvedValue([]),
    useCameraPermissions: jest.fn(),
  };
});

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
    ScanStage: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, {}, children),
    BridgeHandoff: ({ visible }: { visible: boolean }) =>
      visible ? React.createElement(View, { testID: 'bridge-handoff' }) : null,
  };
});

jest.mock('../src/components/CameraOverlay', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraOverlay: (props: { state: string }) => {
      mockOverlay.state = props.state;
      return React.createElement(View, { testID: 'camera-overlay' });
    },
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
  mapBarcodeBoundsToOverlay: jest
    .fn()
    .mockReturnValue({ origin: { x: 0, y: 0 }, size: { width: 100, height: 40 } }),
  syntheticWipesBarcodeBounds: jest
    .fn()
    .mockReturnValue({ origin: { x: 0, y: 0 }, size: { width: 100, height: 40 } }),
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

describe('CameraScreen (app/index.tsx)', () => {
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
      expect(screen.getByText('We need your permission to show the camera')).toBeTruthy();
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
    const scanEvent = {
      data: '08066282',
      type: 'ean8',
      bounds: { origin: { x: 10, y: 20 }, size: { width: 100, height: 40 } },
    };

    const renderGranted = () => {
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
    };

    it('fires haptic feedback when a barcode is scanned', () => {
      const Haptics = require('expo-haptics');
      renderGranted();
      act(() => mockCamera.props.onBarcodeScanned(scanEvent));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('throttles barcode events to at most one per BARCODE_THROTTLE_MS', () => {
      const Haptics = require('expo-haptics');
      renderGranted();
      act(() => {
        mockCamera.props.onBarcodeScanned(scanEvent);
        mockCamera.props.onBarcodeScanned(scanEvent);
      });
      const mediumCalls = Haptics.impactAsync.mock.calls.filter(
        ([style]: [string]) => style === Haptics.ImpactFeedbackStyle.Medium,
      );
      expect(mediumCalls).toHaveLength(1);
    });

    it('transitions viewfinder state to barcode_lock on successful scan', () => {
      renderGranted();
      expect(mockOverlay.state).toBe('passive_search');
      act(() => mockCamera.props.onBarcodeScanned(scanEvent));
      expect(mockOverlay.state).toBe('barcode_lock');
    });

    it('clears barcode_lock state after 4500ms', () => {
      jest.useFakeTimers();
      try {
        renderGranted();
        act(() => mockCamera.props.onBarcodeScanned(scanEvent));
        act(() => jest.advanceTimersByTime(4499));
        expect(mockOverlay.state).toBe('barcode_lock');
        act(() => jest.advanceTimersByTime(1));
        expect(mockOverlay.state).toBe('passive_search');
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('OCR capture', () => {
    const photo = { uri: 'file://photo.jpg', width: 3000, height: 4000 };

    beforeEach(() => {
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
    });

    it('disables the capture button while scanning is in progress', async () => {
      let resolvePhoto: (p: typeof photo) => void = () => {};
      mockCamera.takePictureAsync.mockReturnValue(new Promise(r => (resolvePhoto = r)));
      render(<CameraScreen />);
      act(() => {
        fireEvent.press(screen.getByTestId('capture-button'));
      });
      expect(screen.getByTestId('capture-button')).toBeDisabled();
      expect(mockOverlay.state).toBe('ocr_synthesis');
      jest.useFakeTimers();
      try {
        await act(async () => resolvePhoto(photo));
        act(() => jest.advanceTimersByTime(440));
      } finally {
        jest.useRealTimers();
      }
    });

    it('shows BridgeHandoff overlay after successful OCR', async () => {
      mockCamera.takePictureAsync.mockResolvedValue(photo);
      render(<CameraScreen />);
      expect(screen.queryByTestId('bridge-handoff')).toBeNull();
      await act(async () => fireEvent.press(screen.getByTestId('capture-button')));
      expect(screen.getByTestId('bridge-handoff')).toBeTruthy();
      expect(mockOverlay.state).toBe('handoff');
    });

    it('navigates to /results with extracted OCR text', async () => {
      jest.useFakeTimers();
      try {
        const { preprocessImageForOCR } = require('../src/services/imageProcessingService');
        mockCamera.takePictureAsync.mockResolvedValue(photo);
        render(<CameraScreen />);
        await act(async () => fireEvent.press(screen.getByTestId('capture-button')));
        expect(preprocessImageForOCR).toHaveBeenCalledWith(photo.uri, {
          width: 3000,
          height: 4000,
        });
        expect(mockPush).not.toHaveBeenCalled();
        act(() => jest.advanceTimersByTime(440));
        expect(mockPush).toHaveBeenCalledWith({
          pathname: '/results',
          params: { text: 'Water, Glycerin' },
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('resets scanning state after navigation', async () => {
      jest.useFakeTimers();
      try {
        mockCamera.takePictureAsync.mockResolvedValue(photo);
        render(<CameraScreen />);
        await act(async () => fireEvent.press(screen.getByTestId('capture-button')));
        act(() => jest.advanceTimersByTime(440));
        expect(screen.queryByTestId('bridge-handoff')).toBeNull();
        expect(screen.getByTestId('capture-button')).not.toBeDisabled();
        expect(mockOverlay.state).toBe('passive_search');
      } finally {
        jest.useRealTimers();
      }
    });

    it('recovers to an idle viewfinder when capture fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCamera.takePictureAsync.mockRejectedValue(new Error('camera busy'));
      render(<CameraScreen />);
      await act(async () => fireEvent.press(screen.getByTestId('capture-button')));
      expect(screen.getByTestId('capture-button')).not.toBeDisabled();
      expect(mockOverlay.state).toBe('passive_search');
      expect(mockPush).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('camera controls', () => {
    it('toggles facing between back and front when flip button is pressed', () => {
      mockUseCameraPermissions.mockReturnValue({ isGranted: true, requestPermission: jest.fn() });
      render(<CameraScreen />);
      expect(mockCamera.props.facing).toBe('back');
      fireEvent.press(screen.getByTestId('flip-button'));
      expect(mockCamera.props.facing).toBe('front');
      fireEvent.press(screen.getByTestId('flip-button'));
      expect(mockCamera.props.facing).toBe('back');
    });
  });
});
