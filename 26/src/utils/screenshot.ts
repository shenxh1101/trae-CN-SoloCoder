import * as THREE from 'three';
import { useConfigStore } from '@/store/useConfigStore';

interface ScreenshotOptions {
  width?: number;
  height?: number;
  scale?: number;
  transparent?: boolean;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export const takeScreenshotFromCanvas = async (scale: number = 2): Promise<string> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        reject(new Error('Canvas not found'));
        return;
      }

      try {
        const { renderer, scene, camera } = useConfigStore.getState().threeRefs || {};
        
        if (renderer && scene && camera) {
          const result = takeScreenshot(renderer, scene, camera, { scale });
          if (result) {
            resolve(result);
            return;
          }
        }

        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        tempCanvas.width = canvas.width * scale;
        tempCanvas.height = canvas.height * scale;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

        const dataUrl = tempCanvas.toDataURL('image/png', 1.0);
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

export const takeScreenshot = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: ScreenshotOptions = {}
): string | null => {
  const {
    width = renderer.domElement.width,
    height = renderer.domElement.height,
    scale = 2,
    transparent = false,
    format = 'png',
    quality = 0.95
  } = options;

  const originalSize = renderer.getSize(new THREE.Vector2());
  const originalClearAlpha = renderer.getClearAlpha();

  try {
    renderer.setSize(width * scale, height * scale, false);
    renderer.setClearAlpha(transparent ? 0 : originalClearAlpha);

    renderer.render(scene, camera);

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = renderer.domElement.toDataURL(mimeType, quality);

    return dataUrl;
  } catch (error) {
    console.error('Failed to take screenshot:', error);
    return null;
  } finally {
    renderer.setSize(originalSize.x, originalSize.y, false);
    renderer.setClearAlpha(originalClearAlpha);
  }
};

export const downloadScreenshot = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  filename: string = 'shoe-design',
  options: ScreenshotOptions = {}
): string | null => {
  const dataUrl = takeScreenshot(renderer, scene, camera, options);
  if (!dataUrl) return null;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${filename}.${options.format || 'png'}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  return dataUrl;
};

export const createThumbnail = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  size: number = 256
): string | null => {
  return takeScreenshot(renderer, scene, camera, {
    width: size,
    height: size,
    scale: 1,
    format: 'png',
    transparent: true
  });
};

export const dataUrlToBlob = (dataUrl: string): Blob | null => {
  try {
    const parts = dataUrl.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uint8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uint8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uint8Array], { type: contentType });
  } catch (error) {
    console.error('Failed to convert dataUrl to blob:', error);
    return null;
  }
};

export const copyImageToClipboard = async (dataUrl: string): Promise<boolean> => {
  try {
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) return false;

    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    return true;
  } catch (error) {
    console.error('Failed to copy image to clipboard:', error);
    return false;
  }
};
