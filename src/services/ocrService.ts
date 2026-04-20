import TextRecognition from '@react-native-ml-kit/text-recognition';

export interface OCRResult {
  text: string;
  confidence: number;
}

export const extractTextFromImage = async (imageUri: string): Promise<OCRResult> => {
  try {
    const result = await TextRecognition.recognize(imageUri);
    return {
      text: result.text,
      confidence: 1.0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`OCR failed: ${message}`);
  }
};
