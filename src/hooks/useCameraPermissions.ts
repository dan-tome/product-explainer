import { useCameraPermissions as useExpoCameraPermissions } from 'expo-camera';
import { useEffect } from 'react';

export function useCameraPermissions() {
  const [permission, requestPermission] = useExpoCameraPermissions();

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  return {
    isGranted: permission ? permission.granted : null,
    canAskAgain: permission?.canAskAgain,
    requestPermission,
  };
}
