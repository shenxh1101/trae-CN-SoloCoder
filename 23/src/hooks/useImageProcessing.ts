import { useCallback } from 'react';
import type { ImageTransform } from '../../shared/types';

export function useImageProcessing() {
  const applyTransformToCanvas = useCallback(
    (
      source: HTMLImageElement | HTMLCanvasElement,
      transform: ImageTransform,
      targetCanvas: HTMLCanvasElement
    ): void => {
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      const { rotation, flipH, flipV, crop } = transform;

      let srcWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
      let srcHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
      let sx = 0;
      let sy = 0;

      if (crop) {
        sx = crop.x;
        sy = crop.y;
        srcWidth = crop.width;
        srcHeight = crop.height;
      }

      const radians = (rotation * Math.PI) / 180;
      const isRotated90or270 = rotation % 180 !== 0;

      const dstWidth = isRotated90or270 ? srcHeight : srcWidth;
      const dstHeight = isRotated90or270 ? srcWidth : srcHeight;

      targetCanvas.width = dstWidth;
      targetCanvas.height = dstHeight;

      ctx.save();
      ctx.translate(dstWidth / 2, dstHeight / 2);
      ctx.rotate(radians);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

      if (source instanceof HTMLCanvasElement) {
        ctx.drawImage(
          source,
          sx,
          sy,
          srcWidth,
          srcHeight,
          -srcWidth / 2,
          -srcHeight / 2,
          srcWidth,
          srcHeight
        );
      } else {
        ctx.drawImage(
          source,
          sx,
          sy,
          srcWidth,
          srcHeight,
          -srcWidth / 2,
          -srcHeight / 2,
          srcWidth,
          srcHeight
        );
      }

      ctx.restore();
    },
    []
  );

  const loadImage = useCallback(
    (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    },
    []
  );

  const processImage = useCallback(
    async (
      imageSrc: string,
      transform: ImageTransform
    ): Promise<string> => {
      const img = await loadImage(imageSrc);
      const canvas = document.createElement('canvas');
      applyTransformToCanvas(img, transform, canvas);
      return canvas.toDataURL('image/jpeg', 0.9);
    },
    [loadImage, applyTransformToCanvas]
  );

  const dataURLtoBlob = useCallback((dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }, []);

  const compressImage = useCallback(
    async (file: File, maxSize: number = 800): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > height && width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            } else if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const generateThumbnail = useCallback(
    async (imageSrc: string, size: number = 200): Promise<string> => {
      const img = await loadImage(imageSrc);
      const canvas = document.createElement('canvas');

      const scale = size / Math.min(img.naturalWidth, img.naturalHeight);
      const width = img.naturalWidth * scale;
      const height = img.naturalHeight * scale;

      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      const sx = (width - size) / 2 / scale;
      const sy = (height - size) / 2 / scale;
      const sSize = size / scale;

      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, size, size);

      return canvas.toDataURL('image/jpeg', 0.8);
    },
    [loadImage]
  );

  return {
    applyTransformToCanvas,
    loadImage,
    processImage,
    dataURLtoBlob,
    compressImage,
    generateThumbnail,
  };
}
