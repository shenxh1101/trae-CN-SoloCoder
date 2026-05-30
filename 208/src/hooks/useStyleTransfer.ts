import { useState, useCallback, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { ArbitraryStyleTransferNetwork } from '@magenta/image';

export interface StyleTransferResult {
  stylizedImage: string | null;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  isModelLoaded: boolean;
}

let styleNet: ArbitraryStyleTransferNetwork | null = null;
let isModelLoaded = false;
let modelLoadingPromise: Promise<void> | null = null;

export const useStyleTransfer = () => {
  const [state, setState] = useState<StyleTransferResult>({
    stylizedImage: null,
    isProcessing: false,
    progress: 0,
    error: null,
    isModelLoaded: false,
  });

  const isLoadingRef = useRef(false);

  const loadModel = useCallback(async () => {
    if (isModelLoaded) {
      setState((prev) => ({ ...prev, isModelLoaded: true }));
      return;
    }

    if (modelLoadingPromise) {
      return modelLoadingPromise;
    }

    isLoadingRef.current = true;
    setState((prev) => ({ ...prev, isProcessing: true, progress: 10, error: null }));

    modelLoadingPromise = (async () => {
      try {
        await tf.ready();
        setState((prev) => ({ ...prev, progress: 30 }));

        styleNet = new ArbitraryStyleTransferNetwork();
        setState((prev) => ({ ...prev, progress: 50 }));

        await styleNet.initialize();
        setState((prev) => ({ ...prev, progress: 100, isProcessing: false, isModelLoaded: true }));

        isModelLoaded = true;
      } catch (error) {
        console.error('Failed to load style transfer model:', error);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: '风格迁移模型加载失败，将使用混合模式',
          isModelLoaded: false,
        }));
      } finally {
        isLoadingRef.current = false;
        modelLoadingPromise = null;
      }
    })();

    return modelLoadingPromise;
  }, []);

  const imageDataToDataURL = (imageData: ImageData): string => {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const stylize = useCallback(
    async (
      contentImage: HTMLImageElement | HTMLCanvasElement,
      styleImage: HTMLImageElement | HTMLCanvasElement,
      styleStrength: number = 0.7
    ): Promise<string | null> => {
      if (!isModelLoaded) {
        await loadModel();
      }

      if (!styleNet) {
        setState((prev) => ({
          ...prev,
          error: '风格迁移模型未加载',
        }));
        return null;
      }

      setState((prev) => ({ ...prev, isProcessing: true, progress: 20, error: null }));

      try {
        setState((prev) => ({ ...prev, progress: 40 }));

        const result = await styleNet.stylize(contentImage, styleImage, styleStrength);

        setState((prev) => ({ ...prev, progress: 80 }));

        const resultDataUrl = imageDataToDataURL(result);

        setState((prev) => ({
          ...prev,
          stylizedImage: resultDataUrl,
          isProcessing: false,
          progress: 100,
        }));

        return resultDataUrl;
      } catch (error) {
        console.error('Style transfer failed:', error);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: '风格迁移失败，请重试',
        }));
        return null;
      }
    },
    [loadModel]
  );

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  return {
    ...state,
    stylize,
    loadModel,
  };
};
