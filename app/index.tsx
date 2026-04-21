import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, scanFromURLAsync, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Camera as CameraIcon, FlipHorizontal as FlipIcon } from 'lucide-react-native';
import { useCameraPermissions } from '../src/hooks/useCameraPermissions';
import { preprocessImageForOCR } from '../src/services/imageProcessingService';
import { extractTextFromImage } from '../src/services/ocrService';
import { BridgeHandoff, ScanStage } from '../src/components/UniversalOcrBridge';
import { CameraOverlay, useOverlayLayout } from '../src/components/CameraOverlay';
import { ghostLabelFromBarcodeData } from '../src/data/gtinMicroLiteracy';
import type { ViewfinderState } from '../src/types/viewfinder';
import type { BarcodeBoundsInput } from '../src/components/CameraOverlay';
import {
  getTestBarcodeWipesAssetUri,
  getTestBarcodeWipesImageSize,
  getTestIngredientsOcrAssetUri,
  mapBarcodeBoundsToOverlay,
  syntheticWipesBarcodeBounds,
} from '../src/dev/cameraTestAssets';

const BARCODE_THROTTLE_MS = 600;

export default function CameraScreen() {
  const { isGranted, requestPermission } = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isScanning, setIsScanning] = useState(false);
  const [handoffVisible, setHandoffVisible] = useState(false);
  const [vfState, setVfState] = useState<ViewfinderState>('passive_search');
  const [barcodeBounds, setBarcodeBounds] = useState<BarcodeBoundsInput | null>(null);
  const [ghostLabel, setGhostLabel] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const lastBarcodeAt = useRef(0);
  const router = useRouter();
  const { layoutW, layoutH, onLayout } = useOverlayLayout();

  useEffect(() => {
    if (handoffVisible) {
      setVfState('handoff');
    } else if (!isScanning && vfState === 'handoff') {
      setVfState('passive_search');
    }
  }, [handoffVisible, isScanning, vfState]);

  const onBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (isScanning || handoffVisible) return;
    const now = Date.now();
    if (now - lastBarcodeAt.current < BARCODE_THROTTLE_MS) return;
    lastBarcodeAt.current = now;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 50);

    setBarcodeBounds(result.bounds);
    setGhostLabel(ghostLabelFromBarcodeData(result.data));
    setVfState('barcode_lock');
  }, [isScanning, handoffVisible]);

  useEffect(() => {
    if (vfState !== 'barcode_lock') return;
    const t = setTimeout(() => {
      setVfState('passive_search');
      setBarcodeBounds(null);
      setGhostLabel(null);
    }, 4500);
    return () => clearTimeout(t);
  }, [vfState]);

  /** Dev: decode bundled wipes barcode. `simulateCapture` runs shutter-style delay + OCR line first (like real capture). */
  const runBundledBarcodeDevScan = useCallback(
    async (simulateCapture: boolean) => {
      if (handoffVisible) return;
      if (simulateCapture) {
        if (isScanning) return;
        setIsScanning(true);
        setVfState('ocr_synthesis');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await new Promise<void>(resolve => setTimeout(resolve, 220));
      } else if (isScanning) {
        return;
      }
      try {
        const uri = getTestBarcodeWipesAssetUri();
        const { width: iw, height: ih } = getTestBarcodeWipesImageSize();
        const lw = Math.max(layoutW, 1);
        const lh = Math.max(layoutH, 1);
        const results = await scanFromURLAsync(uri, [
          'ean13',
          'ean8',
          'upc_a',
          'upc_e',
          'qr',
          'code128',
        ]);
        lastBarcodeAt.current = Date.now();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 50);
        let data = '08066282';
        let bounds: BarcodeBoundsInput;
        if (results.length > 0) {
          data = results[0].data;
          bounds = mapBarcodeBoundsToOverlay(results[0].bounds, iw, ih, lw, lh);
        } else {
          bounds = syntheticWipesBarcodeBounds(lw, lh);
        }
        setBarcodeBounds(bounds);
        setGhostLabel(ghostLabelFromBarcodeData(data));
        setVfState('barcode_lock');
      } catch (e) {
        console.error(e);
      } finally {
        if (simulateCapture) {
          setIsScanning(false);
        }
      }
    },
    [isScanning, handoffVisible, layoutW, layoutH],
  );

  if (isGranted === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isGranted === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.text}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (cameraRef.current && !isScanning) {
      setIsScanning(true);
      setVfState('ocr_synthesis');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });

        if (photo) {
          const processedUri = await preprocessImageForOCR(photo.uri, {
            width: photo.width,
            height: photo.height,
          });
          const result = await extractTextFromImage(processedUri);

          setHandoffVisible(true);
          Haptics.selectionAsync();
          setTimeout(() => {
            router.push({
              pathname: '/results',
              params: { text: result.text },
            });
            setHandoffVisible(false);
            setIsScanning(false);
            setVfState('passive_search');
          }, 440);
          return;
        }
        setIsScanning(false);
        setVfState('passive_search');
      } catch (error) {
        console.error('Error taking picture:', error);
        setIsScanning(false);
        setVfState('passive_search');
      }
    }
  };

  return (
    <View style={styles.root}>
      <ScanStage>
        <View style={styles.container} onLayout={onLayout}>
          <CameraView
            style={styles.camera}
            facing={facing}
            ref={cameraRef}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
            }}
            onBarcodeScanned={onBarcodeScanned}
          />
          <CameraOverlay
            state={vfState}
            layoutW={layoutW}
            layoutH={layoutH}
            barcodeBounds={barcodeBounds}
            ghostLabel={ghostLabel}
          />
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.scanAreaPlaceholder} />
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing}>
              <FlipIcon size={30} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.captureButton, isScanning && styles.disabledButton]}
              onPress={takePicture}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color="white" />
              ) : (
                <CameraIcon size={40} color="white" />
              )}
            </TouchableOpacity>
            {__DEV__ && (
              <>
                <TouchableOpacity
                  style={styles.devButton}
                  onPress={() => {
                    setIsScanning(true);
                    const stress = 'INGREDIENTS: Resorcinol, Oxybenzone, Water, Glycerin';
                    setHandoffVisible(true);
                    Haptics.selectionAsync();
                    setTimeout(() => {
                      router.push({ pathname: '/results', params: { text: stress } });
                      setHandoffVisible(false);
                      setIsScanning(false);
                      setVfState('passive_search');
                    }, 440);
                  }}
                >
                  <Text style={styles.devButtonText}>STRESS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.devButton}
                  onPress={async () => {
                    if (isScanning || handoffVisible) return;
                    setIsScanning(true);
                    try {
                      const result = await extractTextFromImage(getTestIngredientsOcrAssetUri());
                      router.push({ pathname: '/results', params: { text: result.text } });
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsScanning(false);
                    }
                  }}
                >
                  <Text style={styles.devButtonText}>OCR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.devButton}
                  onPress={() => {
                    if (isScanning || handoffVisible) return;
                    void runBundledBarcodeDevScan(false);
                  }}
                >
                  <Text style={styles.devButtonText}>BC</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.devButton}
                  onPress={() => {
                    void runBundledBarcodeDevScan(true);
                  }}
                >
                  <Text style={styles.devButtonText}>CAP</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScanStage>
      <BridgeHandoff visible={handoffVisible} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAreaPlaceholder: {
    width: '80%',
    height: '40%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#f4511e',
    padding: 15,
    borderRadius: 10,
    alignSelf: 'center',
  },
  iconButton: {
    padding: 10,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f4511e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  devButton: {
    backgroundColor: 'rgba(255,255,0,0.7)',
    padding: 8,
    borderRadius: 6,
  },
  devButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
