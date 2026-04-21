# Product Explainer

Product Explainer is a mobile application prototype built with Expo and React Native. It allows users to scan food product ingredient lists using their camera and receive instant feedback on the health safety of those ingredients.

## 🚀 Current Implementation

The current version of the app is a **functional prototype** with the following architecture:

### System Architecture Overview
The app follows a linear data flow:
1.  **Capture**: User captures an image of an ingredient list using the camera.
2.  **Pre-process**: The image is resized and compressed to optimize for future OCR processing.
3.  **OCR (Mocked)**: Text is "extracted" from the image (currently returns a hardcoded list of ingredients).
4.  **Analysis (Local Lookup)**: The extracted text is parsed and matched against a local JSON database of common ingredients.
5.  **Display**: Results are categorized (Safe, Warning, Avoid) and displayed in a list with detailed information.

### Tech Stack
- **Framework**: Expo (SDK 54) / React Native
- **Navigation**: Expo Router (File-based)
- **Icons**: Lucide React Native
- **State Management**: React Hooks (useState, useMemo, useRef)
- **Image Processing**: `expo-image-manipulator`

## 🛠️ Components & Services

-   `app/index.tsx`: The primary camera interface using `expo-camera`.
-   `app/results.tsx`: The results dashboard showing the ingredient breakdown.
-   `src/services/ocrService.ts`: Placeholder for Optical Character Recognition logic.
-   `src/services/analysisService.ts`: Core logic for parsing ingredient strings and matching them against safety data.
-   `src/data/ingredients.json`: Seed database for ingredient safety information.

## ⚠️ Gaps & Areas for Real Implementation

This prototype identifies several key areas that require real-world implementation before production:

### 1. Real OCR Integration
*   **Current State**: Returns a hardcoded string: *"Water, Sugar, Maltodextrin, Palm Oil, Salt, Citric Acid, Soy Lecithin"*.
*   **Need**: Integration with a real OCR engine like **Google Cloud Vision**, **AWS Rekognition**, or on-device models like **ML Kit**.
*   **Challenges**: Handling curved surfaces, small fonts, and low-light conditions.

### 2. AI-Driven Ingredient Analysis
*   **Current State**: Simple substring matching against a small JSON file (`ingredients.json`).
*   **Issues**:
    *   **Case Sensitivity**: Currently relies on exact or substring matching which can be fragile.
    *   **Limited Database**: Only handles a few dozen ingredients.
    *   **Lack of Context**: Cannot distinguish between safe and unsafe uses of the same ingredient.
*   **Need**: Integration with a Large Language Model (LLM) such as **OpenAI GPT-4o** or **Google Gemini**.
*   **Benefits**:
    *   Better handling of spelling variations and synonyms.
    *   Identification of complex additives not in a static database.
    *   Context-aware safety advice (e.g., cross-referencing with user allergies).

### 3. Environment Variable Security
*   **Need**: Once APIs (OCR/LLM) are integrated, the app will need a secure way to manage API keys using `expo-constants` or `.env` files (properly ignored in Git).

### 4. Offline Functionality
*   **Need**: The current mock works offline, but real OCR/AI typically requires an internet connection. Production should explore on-device OCR (Tesseract/MLKit) for better offline reliability.

### 5. Error Handling & Edge Cases
*   **Need**: More robust handling for:
    *   Images containing no text.
    *   Network timeouts during API calls.
    *   User denying camera permissions.

## 📖 Development Guide

### Prerequisites
- Node.js
- Expo Go (on mobile) or Android/iOS Emulator

### Setup
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the app:
    ```bash
    npm start
    ```

### Building
For generating a test APK:
```bash
eas build --platform android --profile preview
```
