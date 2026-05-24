import type {
  PendingImage,
  ImageClassification,
  BatchReport,
  ImageTransform,
  FeedbackData,
} from '../../shared/types';

export * from '../../shared/types';

export interface AppState {
  pendingImages: PendingImage[];
  classifications: ImageClassification[];
  history: ImageClassification[];
  threshold: number;
  batchReport: BatchReport | null;
  isClassifying: boolean;
  activeTab: 'upload' | 'url';
  selectedImageId: string | null;
  editorImage: PendingImage | null;
}

export interface AppActions {
  addPendingImage: (image: Omit<PendingImage, 'id' | 'transform' | 'processedPreview'>) => void;
  removePendingImage: (id: string) => void;
  clearPendingImages: () => void;
  updateImageTransform: (id: string, transform: Partial<ImageTransform>) => void;
  setClassifications: (classifications: ImageClassification[]) => void;
  addClassification: (classification: ImageClassification) => void;
  setHistory: (history: ImageClassification[]) => void;
  setThreshold: (threshold: number) => void;
  setBatchReport: (report: BatchReport | null) => void;
  setIsClassifying: (isClassifying: boolean) => void;
  setActiveTab: (tab: 'upload' | 'url') => void;
  setSelectedImageId: (id: string | null) => void;
  setEditorImage: (image: PendingImage | null) => void;
  updateProcessedPreview: (id: string, preview: string) => void;
  submitFeedback: (imageId: string, feedback: FeedbackData) => void;
  isClassifying: boolean;
}

export type AppStore = AppState & AppActions;
