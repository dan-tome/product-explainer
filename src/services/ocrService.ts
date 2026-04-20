/**
 * OCR Service to handle text extraction from images.
 * In a real-world scenario, this would interface with Google Cloud Vision,
 * AWS Rekognition, or an on-device ML model.
 */

export interface OCRResult {
  text: string;
  confidence: number;
}

export const extractTextFromImage = async (imageUri: string): Promise<OCRResult> => {
  console.log('Extracting text from image:', imageUri);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // For demonstration purposes, we return a mock list of ingredients
  // In a real app, this would be the actual text found in the image
  const mockIngredients = "Water, Sugar, Maltodextrin, Palm Oil, Salt, Citric Acid, Soy Lecithin";
  
  return {
    text: mockIngredients,
    confidence: 0.95,
  };
};
