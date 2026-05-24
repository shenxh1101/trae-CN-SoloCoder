import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  classifyImages,
  classifyFromUrl,
  submitFeedback as apiSubmitFeedback,
  getHistory as apiGetHistory,
  getFeedback as apiGetFeedback,
  reclassifyHistoryItem as apiReclassify,
  getConfusionMatrix as apiGetConfusionMatrix,
} from '../utils/api';
import { useImageProcessing } from './useImageProcessing';
import type {
  ImageClassification,
  BatchReport,
  FeedbackSubmission,
  FeedbackData,
  ConfusionMatrixData,
  ApiResponse,
  FeedbackSubmission as FeedbackSubmissionType,
} from '../../shared/types';

export function useClassification() {
  const store = useAppStore();
  const {
    pendingImages,
    setClassifications,
    setBatchReport,
    setIsClassifying,
    setHistory,
    clearPendingImages,
    submitFeedback: storeSubmitFeedback,
    isClassifying,
  } = store;

  const { processImage, dataURLtoBlob } = useImageProcessing();

  const generateBatchReport = useCallback(
    (classifications: ImageClassification[]): BatchReport => {
      const classFrequency: Record<string, number> = {};
      let totalConfidence = 0;

      classifications.forEach((cls) => {
        const topResult = cls.results[0];
        if (topResult) {
          const className = topResult.className;
          classFrequency[className] = (classFrequency[className] || 0) + 1;
          totalConfidence += topResult.confidence;
        }
      });

      return {
        totalImages: classifications.length,
        classFrequency,
        averageConfidence: classifications.length > 0 ? totalConfidence / classifications.length : 0,
        timestamp: Date.now(),
      };
    },
    []
  );

  const performClassification = useCallback(async () => {
    if (pendingImages.length === 0) return;

    setIsClassifying(true);

    try {
      const processedImages = await Promise.all(
        pendingImages.map(async (img) => {
          const processed = await processImage(img.preview, img.transform);
          const blob = dataURLtoBlob(processed);
          return { blob, filename: img.filename };
        })
      );

      const response = await classifyImages(processedImages);

      if (response.success && response.data) {
        setClassifications(response.data);
        setBatchReport(generateBatchReport(response.data));
        clearPendingImages();
      } else {
        console.error('Classification failed:', response.error);
      }
    } catch (error) {
      console.error('Classification error:', error);
    } finally {
      setIsClassifying(false);
    }
  }, [pendingImages, processImage, dataURLtoBlob, setClassifications, setBatchReport, setIsClassifying, clearPendingImages, generateBatchReport]);

  const performUrlClassification = useCallback(
    async (url: string): Promise<ApiResponse<ImageClassification[]>> => {
      setIsClassifying(true);
      try {
        const response = await classifyFromUrl(url);
        if (response.success && response.data) {
          setClassifications(response.data);
          setBatchReport(generateBatchReport(response.data));
        }
        return response;
      } finally {
        setIsClassifying(false);
      }
    },
    [setClassifications, setBatchReport, setIsClassifying, generateBatchReport]
  );

  const submitFeedbackFn = useCallback(
    async (feedback: FeedbackSubmission): Promise<ApiResponse<void>> => {
      const response = await apiSubmitFeedback(feedback);
      if (response.success) {
        const feedbackData: FeedbackData = {
          isCorrect: feedback.isCorrect,
          correctClass: feedback.correctClass || undefined,
          timestamp: Date.now(),
        };
        storeSubmitFeedback(feedback.imageId, feedbackData);
      }
      return response;
    },
    [storeSubmitFeedback]
  );

  const getFeedback = useCallback(
    async (): Promise<ApiResponse<FeedbackSubmissionType[]>> => {
      return await apiGetFeedback();
    },
    []
  );

  const loadHistory = useCallback(async (limit: number = 20) => {
    const response = await apiGetHistory(limit);
    if (response.success && response.data) {
      setHistory(response.data);
    }
    return response;
  }, [setHistory]);

  const reclassifyItem = useCallback(
    async (id: string): Promise<ApiResponse<ImageClassification>> => {
      setIsClassifying(true);
      try {
        return await apiReclassify(id);
      } finally {
        setIsClassifying(false);
      }
    },
    [setIsClassifying]
  );

  const getConfusionMatrix = useCallback(
    async (): Promise<ApiResponse<ConfusionMatrixData>> => {
      return await apiGetConfusionMatrix();
    },
    []
  );

  return {
    performClassification,
    performUrlClassification,
    submitFeedback: submitFeedbackFn,
    getFeedback,
    loadHistory,
    reclassifyItem,
    getConfusionMatrix,
    isClassifying,
  };
}
