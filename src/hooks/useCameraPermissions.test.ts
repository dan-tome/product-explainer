import { renderHook, act } from '@testing-library/react-native';

jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(),
}));

import { useCameraPermissions as useExpoCameraPermissions } from 'expo-camera';
import { useCameraPermissions } from './useCameraPermissions';

const mockUseCameraPermissions = useExpoCameraPermissions as jest.Mock;

describe.skip('useCameraPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isGranted=null while permission object is not yet resolved', () => {
    mockUseCameraPermissions.mockReturnValue([null, jest.fn()]);
    const { result } = renderHook(() => useCameraPermissions());
    expect(result.current.isGranted).toBeNull();
  });

  it('calls requestPermission automatically when permission is null', () => {
    const requestPermission = jest.fn();
    mockUseCameraPermissions.mockReturnValue([null, requestPermission]);
    renderHook(() => useCameraPermissions());
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('does not call requestPermission again when permission is already set', () => {
    const requestPermission = jest.fn();
    mockUseCameraPermissions.mockReturnValue([
      { granted: true, canAskAgain: false },
      requestPermission,
    ]);
    renderHook(() => useCameraPermissions());
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('returns isGranted=true when permission is granted', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true, canAskAgain: false },
      jest.fn(),
    ]);
    const { result } = renderHook(() => useCameraPermissions());
    expect(result.current.isGranted).toBe(true);
  });

  it('returns isGranted=false when permission is denied', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: false, canAskAgain: true },
      jest.fn(),
    ]);
    const { result } = renderHook(() => useCameraPermissions());
    expect(result.current.isGranted).toBe(false);
  });

  it('returns canAskAgain from the permission object', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: false, canAskAgain: true },
      jest.fn(),
    ]);
    const { result } = renderHook(() => useCameraPermissions());
    expect(result.current.canAskAgain).toBe(true);
  });

  it('exposes requestPermission so callers can trigger it manually', () => {
    const requestPermission = jest.fn().mockResolvedValue({ granted: true });
    mockUseCameraPermissions.mockReturnValue([{ granted: false, canAskAgain: true }, requestPermission]);
    const { result } = renderHook(() => useCameraPermissions());
    act(() => {
      result.current.requestPermission();
    });
    expect(requestPermission).toHaveBeenCalled();
  });
});
