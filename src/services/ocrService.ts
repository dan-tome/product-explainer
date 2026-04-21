import * as FileSystem from 'expo-file-system';

/**
 * OCR Service to handle text extraction from images.
 * 
 * GAP: Currently relies on Google Cloud Vision API which requires an internet 
 * connection and an API key. For production, consider on-device alternatives
 * like MLKit or Tesseract for better privacy and offline support.
 */

export interface OCRResult {
  text: string;
  confidence: number;
}

const GOOGLE_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY;

export const extractTextFromImage = async (imageUri: string): Promise<OCRResult> => {
  console.log('Extracting text from image:', imageUri);
  
  if (!GOOGLE_VISION_API_KEY) {
    console.warn('Google Cloud Vision API key is missing. Falling back to mock.');
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      text: "Water, Sugar, Maltodextrin, Palm Oil, Salt, Citric Acid, Soy Lecithin",
      confidence: 0.95,
    };
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const text = data.responses[0]?.fullTextAnnotation?.text || '';
    
    return {
      text: text.replace(/\n/g, ', '),
      confidence: 1.0, // Google Vision doesn't provide a single confidence score for the whole block easily here
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
};
