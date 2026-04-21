jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { PNG: 'png', JPEG: 'jpg' },
}));

import * as ImageManipulator from 'expo-image-manipulator';
import { preprocessImageForOCR } from './imageProcessingService';

const mockManipulate = ImageManipulator.manipulateAsync as jest.Mock;
const PHOTO = { width: 3000, height: 4000 };

describe('preprocessImageForOCR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManipulate.mockResolvedValue({ uri: 'file:///processed.png' });
  });

  it('crops to center 80% wide × 40% tall of the photo', async () => {
    await preprocessImageForOCR('file:///original.jpg', PHOTO);
    const actions = mockManipulate.mock.calls[0][1];
    expect(actions[0]).toEqual({
      crop: { originX: 300, originY: 1200, width: 2400, height: 1600 },
    });
  });

  it('resizes to 1500px wide after crop', async () => {
    await preprocessImageForOCR('file:///original.jpg', PHOTO);
    const actions = mockManipulate.mock.calls[0][1];
    expect(actions[1]).toEqual({ resize: { width: 1500 } });
  });

  it('saves as PNG with full quality', async () => {
    await preprocessImageForOCR('file:///original.jpg', PHOTO);
    const options = mockManipulate.mock.calls[0][2];
    expect(options.format).toBe('png');
    expect(options.compress).toBe(1);
  });

  it('passes the original URI to manipulateAsync', async () => {
    await preprocessImageForOCR('file:///original.jpg', PHOTO);
    expect(mockManipulate.mock.calls[0][0]).toBe('file:///original.jpg');
  });

  it('returns the processed image URI', async () => {
    const uri = await preprocessImageForOCR('file:///original.jpg', PHOTO);
    expect(uri).toBe('file:///processed.png');
  });
});
