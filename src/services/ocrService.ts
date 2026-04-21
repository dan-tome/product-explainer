/**
 * OCR Service to handle text extraction from images.
 * 
 * TODO: In a real-world scenario, this would interface with:
 * - Google Cloud Vision API
 * - AWS Rekognition
 * - On-device ML model (e.g., Apple's Vision framework or Google ML Kit)
 * 
 * Current status: MOCKED
 * The service currently returns a hardcoded list of ingredients for demonstration.
 */

export interface OCRResult {
  text: string;
  confidence: number;
}

export const extractTextFromImage = async (imageUri: string): Promise<OCRResult> => {
  console.log('Extracting text from image:', imageUri);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // MOCK IMPLEMENTATION
  // In a real implementation, we would send the imageUri to an OCR provider.
  const mockIngredients = "Water, Sugar, Maltodextrin, Palm Oil, Salt, Citric Acid, Soy Lecithin";
  
  return {
    text: mockIngredients,
    confidence: 0.95,
  };
};
