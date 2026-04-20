jest.mock('@react-native-ml-kit/text-recognition', () => ({
  __esModule: true,
  default: {
    recognize: jest.fn(),
  },
}));

import TextRecognition from '@react-native-ml-kit/text-recognition';
import { extractTextFromImage } from './ocrService';

const mockRecognize = TextRecognition.recognize as jest.Mock;

describe('extractTextFromImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls ML Kit with the provided image URI', async () => {
    mockRecognize.mockResolvedValue({ text: 'Water, Sugar' });
    await extractTextFromImage('file:///some/image.jpg');
    expect(mockRecognize).toHaveBeenCalledWith('file:///some/image.jpg');
  });

  it('returns the text recognized by ML Kit', async () => {
    mockRecognize.mockResolvedValue({ text: 'Water, Sugar, Salt' });
    const result = await extractTextFromImage('file:///some/image.jpg');
    expect(result.text).toBe('Water, Sugar, Salt');
  });

  it('returns confidence of 1.0', async () => {
    mockRecognize.mockResolvedValue({ text: 'Water' });
    const result = await extractTextFromImage('file:///some/image.jpg');
    expect(result.confidence).toBe(1.0);
  });

  it('returns empty text when ML Kit finds nothing', async () => {
    mockRecognize.mockResolvedValue({ text: '' });
    const result = await extractTextFromImage('file:///blank.jpg');
    expect(result.text).toBe('');
    expect(result.confidence).toBe(1.0);
  });

  it('rethrows ML Kit errors with a prefixed message', async () => {
    mockRecognize.mockRejectedValue(new Error('native crash'));
    await expect(extractTextFromImage('file:///bad.jpg')).rejects.toThrow('OCR failed: native crash');
  });
});
