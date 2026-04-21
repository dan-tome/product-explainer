import { Image } from 'react-native';
import type { BarcodeBounds } from 'expo-camera';
import type { BarcodeBoundsInput } from '../components/CameraOverlay';

// Bundled fixtures (same pattern as packaged app assets in app.json).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const testBarcodeWipes = require('../../assets/test-barcode-wipes.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const testIngredientsOcr = require('../../assets/test-ingredients-ocr.png');

export function getTestBarcodeWipesAssetUri(): string {
  return Image.resolveAssetSource(testBarcodeWipes).uri;
}

export function getTestBarcodeWipesImageSize(): { width: number; height: number } {
  const s = Image.resolveAssetSource(testBarcodeWipes);
  return { width: Math.max(s.width ?? 1, 1), height: Math.max(s.height ?? 1, 1) };
}

/** OCR dev image (ingredients list), bundled — replaces device-cache file path. */
export function getTestIngredientsOcrAssetUri(): string {
  return Image.resolveAssetSource(testIngredientsOcr).uri;
}

/** Map file-scan bounds (image pixels) to live preview overlay coordinates. */
export function mapBarcodeBoundsToOverlay(
  bounds: BarcodeBounds,
  imageW: number,
  imageH: number,
  layoutW: number,
  layoutH: number,
): BarcodeBoundsInput {
  if (imageW <= 0 || imageH <= 0 || layoutW <= 0 || layoutH <= 0) {
    return {
      origin: { x: bounds.origin.x, y: bounds.origin.y },
      size: { width: bounds.size.width, height: bounds.size.height },
    };
  }
  const sx = layoutW / imageW;
  const sy = layoutH / imageH;
  return {
    origin: { x: bounds.origin.x * sx, y: bounds.origin.y * sy },
    size: { width: bounds.size.width * sx, height: bounds.size.height * sy },
  };
}

/**
 * Fallback when `scanFromURLAsync` finds no barcode (e.g. iOS: historically QR-only for URL scans).
 * Places the teal glow near the lower-center where the EAN-8 sits on test-barcode-wipes.png.
 */
export function syntheticWipesBarcodeBounds(layoutW: number, layoutH: number): BarcodeBoundsInput {
  const lw = Math.max(layoutW, 1);
  const lh = Math.max(layoutH, 1);
  const w = Math.min(lw * 0.42, 200);
  const h = w * 0.45;
  const cx = lw * 0.5;
  const cy = lh * 0.62;
  return {
    origin: { x: cx - w / 2, y: cy - h / 2 },
    size: { width: w, height: h },
  };
}
