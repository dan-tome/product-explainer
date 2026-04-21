# Product Explainer

A mobile application built with Expo and React Native that helps users understand food product ingredients by taking a photo of the ingredient list. The app performs OCR to extract text and then analyzes each ingredient to provide health-related information.

## System Architecture

### Overview
The app follows a simple linear data flow from capture to analysis:
`Camera Capture -> Image Pre-processing -> OCR (Text Extraction) -> Ingredient Analysis -> Results UI`

### Architecture Diagram (Text-based)
```
[ Mobile App (Expo/React Native) ]
          |
          v
[ Camera View (expo-camera) ] --- Capture Image ---> [ Image Manipulator ]
                                                            |
                                                            v
[ OCR Service ] <----------------------------------- [ Base64 Image ]
      |
      |-- (Real) --> [ Google Cloud Vision API ]
      |-- (Mock) --> [ Static Mock Text ]
      |
      v
[ Analysis Service ]
      |
      |-- (Real) --> [ OpenAI GPT-4o API ]
      |-- (Fallback) --> [ Local ingredients.json lookup ]
      |
      v
[ Results Screen ] <--- Display Analyzed Ingredients
```

### Key Components
- **`app/index.tsx`**: Main camera screen for capturing product ingredient labels.
- **`app/results.tsx`**: Displays the summary and detailed breakdown of ingredients.
- **`src/services/ocrService.ts`**: Handles text extraction from images using Google Cloud Vision.
- **`src/services/analysisService.ts`**: Analyzes extracted text using AI or local lookup.
- **`src/components/IngredientCard.tsx`**: UI component for individual ingredient details.

## Current State & Gaps

### Implemented Features
- [x] Camera integration with permissions handling.
- [x] Image pre-processing (resize/compress) for OCR optimization.
- [x] Functional UI for viewing analysis results.
- [x] Local fallback for ingredient analysis using a static JSON database.
- [x] Structure for Google Cloud Vision and OpenAI integration.

### Identified Gaps & Issues
1.  **API Key Management**: Real OCR and AI analysis require API keys. Currently, these are handled via environment variables (`EXPO_PUBLIC_...`), but they are not provided in the repository.
2.  **Offline Support**: Real OCR and AI analysis require an internet connection. The app lacks an offline mode beyond the local fallback.
3.  **OCR Accuracy**: Ingredient lists can be complex (wrapping text, small fonts, curved surfaces). The current OCR implementation is a basic single-pass detection.
4.  **Error Handling**: Basic error handling is present, but more robust feedback (e.g., "Could not find text in image") is needed.
5.  **User Privacy**: Captured images are sent to third-party APIs (Google/OpenAI). A privacy policy and user consent mechanism are missing.

## Getting Started

### Prerequisites
- Node.js and npm
- Expo Go app on your mobile device (for development)

### Environment Setup
Create a `.env` file in the root directory based on `.env.example`:
```env
EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY=your_key
EXPO_PUBLIC_OPENAI_API_KEY=your_key
```

### Installation
1.  Clone the repository
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm start
    ```

## Roadmap
1.  **On-device OCR**: Explore Tesseract.js or MLKit for offline-first OCR.
2.  **Richer Analysis**: Enhance AI prompts to include allergen warnings and dietary preference matching (e.g., Vegan/Keto).
3.  **History**: Store previous scans locally using `expo-sqlite` or `AsyncStorage`.
4.  **Community Database**: Allow users to contribute to the local ingredients database.

## Deployment

Refer to the original [EAS Build instructions](README.md) (restored below) for generating APKs.

---

### How to build for Android (APK)

To install this app on your Android phone for testing, you can generate an APK using Expo EAS.

1.  **Install EAS CLI**: `npm install -g eas-cli`
2.  **Login**: `eas login`
3.  **Build**: `npm run build:android`
