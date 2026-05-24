export interface ClassificationResult {
  classId: number;
  className: string;
  confidence: number;
}

export interface ImageClassification {
  id: string;
  imageUrl: string;
  thumbnail: string;
  filename: string;
  results: ClassificationResult[];
  timestamp: number;
  feedback?: FeedbackData;
}

export interface FeedbackData {
  isCorrect: boolean;
  correctClass?: string;
  timestamp: number;
}

export interface BatchReport {
  totalImages: number;
  classFrequency: Record<string, number>;
  averageConfidence: number;
  timestamp: number;
}

export interface ConfusionMatrixData {
  classes: string[];
  matrix: number[][];
  totalSamples: number;
  accuracy: number;
}

export interface FeedbackSubmission {
  imageId: string;
  predictedClass: string;
  isCorrect: boolean;
  correctClass?: string | null;
}

export interface ImageTransform {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PendingImage {
  id: string;
  file?: File;
  url?: string;
  preview: string;
  filename: string;
  transform: ImageTransform;
  processedPreview: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
