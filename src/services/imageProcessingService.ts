import * as ImageManipulator from 'expo-image-manipulator';

export const preprocessImageForOCR = async (
  uri: string,
  photoDimensions: { width: number; height: number }
): Promise<string> => {
  const { width, height } = photoDimensions;
  const cropWidth = Math.round(width * 0.8);
  const cropHeight = Math.round(height * 0.4);
  const originX = Math.round((width - cropWidth) / 2);
  const originY = Math.round((height - cropHeight) / 2);

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      { crop: { originX, originY, width: cropWidth, height: cropHeight } },
      { resize: { width: 1500 } },
    ],
    { compress: 1, format: ImageManipulator.SaveFormat.PNG }
  );

  return result.uri;
};
