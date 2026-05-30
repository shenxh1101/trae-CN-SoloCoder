import type { CubeFace } from '../types';

export const downloadDataURL = (dataUrl: string, filename: string): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
};

export const captureScreenshot = (filename: string = 'neural-style-cube.png'): void => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;

  const dataUrl = canvas.toDataURL('image/png');
  downloadDataURL(dataUrl, filename);
};

export const captureCanvasTexture = (
  canvas: HTMLCanvasElement,
  filename: string
): void => {
  const dataUrl = canvas.toDataURL('image/png');
  downloadDataURL(dataUrl, filename);
};

const faceFilenames: Record<CubeFace, string> = {
  front: 'front-face',
  back: 'back-face',
  left: 'left-face',
  right: 'right-face',
  top: 'top-face',
  bottom: 'bottom-face',
};

export const getFaceFilename = (face: CubeFace, styleName: string): string => {
  const sanitizedStyleName = styleName.toLowerCase().replace(/\s+/g, '-');
  return `${faceFilenames[face]}-${sanitizedStyleName}.png`;
};
