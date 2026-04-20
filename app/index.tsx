import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Camera as CameraIcon, FlipHorizontal as FlipIcon } from 'lucide-react-native';
import { useCameraPermissions } from '../src/hooks/useCameraPermissions';
import * as ImageManipulator from 'expo-image-manipulator';
import { extractTextFromImage } from '../src/services/ocrService';

export default function CameraScreen() {
  const { isGranted, requestPermission } = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isScanning, setIsScanning] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  if (isGranted === null) {
    return <View style={styles.container}><ActivityIndicator size="large" /></View>;
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
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });

        if (photo) {
          // Pre-process image to optimize for OCR
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ resize: { width: 1000 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );

          // Perform OCR
          const result = await extractTextFromImage(manipulatedImage.uri);
          
          // Navigate to results
          router.push({
            pathname: '/results',
            params: { text: result.text }
          });
        }
      } catch (error) {
        console.error('Error taking picture:', error);
      } finally {
        setIsScanning(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
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
          
          <View style={styles.spacer} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: '80%',
    height: '40%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonContainer: {
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
  spacer: {
    width: 50,
  }
});
