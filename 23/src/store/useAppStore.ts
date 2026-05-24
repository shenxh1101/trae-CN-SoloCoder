import { create } from 'zustand';
import type { AppStore, PendingImage, ImageClassification, FeedbackData } from '../types';
import { generateId } from '../utils/api';

export const useAppStore = create<AppStore>((set, get) => ({
  pendingImages: [],
  classifications: [],
  history: [],
  threshold: 0.0,
  batchReport: null,
  isClassifying: false,
  activeTab: 'upload',
  selectedImageId: null,
  editorImage: null,

  addPendingImage: (image) => {
    const { pendingImages } = get();
    if (pendingImages.length >= 10) return;
    const newImage: PendingImage = {
      ...image,
      id: generateId(),
      transform: {
        rotation: 0,
        flipH: false,
        flipV: false,
      },
      processedPreview: image.preview,
    } as PendingImage;
    set({ pendingImages: [...pendingImages, newImage] });
  },

  removePendingImage: (id) => {
    set((state) => ({
      pendingImages: state.pendingImages.filter((img) => img.id !== id),
    }));
  },

  clearPendingImages: () => {
    set({ pendingImages: [] });
  },

  updateImageTransform: (id, transform) => {
    set((state) => ({
      pendingImages: state.pendingImages.map((img) =>
        img.id === id
          ? { ...img, transform: { ...img.transform, ...transform } }
          : img
      ),
    }));
  },

  updateProcessedPreview: (id, preview) => {
    set((state) => ({
      pendingImages: state.pendingImages.map((img) =>
        img.id === id ? { ...img, processedPreview: preview } : img
      ),
    }));
  },

  setClassifications: (classifications) => {
    set({ classifications });
  },

  addClassification: (classification) => {
    set((state) => ({
      classifications: [...state.classifications, classification],
    }));
  },

  setHistory: (history) => {
    set({ history });
  },

  setThreshold: (threshold) => {
    set({ threshold });
  },

  setBatchReport: (batchReport) => {
    set({ batchReport });
  },

  setIsClassifying: (isClassifying) => {
    set({ isClassifying });
  },

  setActiveTab: (activeTab) => {
    set({ activeTab });
  },

  setSelectedImageId: (selectedImageId) => {
    set({ selectedImageId });
  },

  setEditorImage: (editorImage) => {
    set({ editorImage });
  },

  submitFeedback: (imageId, feedback) => {
    const updateWithFeedback = (item: ImageClassification) =>
      item.id === imageId ? { ...item, feedback } : item;

    set((state) => ({
      classifications: state.classifications.map(updateWithFeedback),
      history: state.history.map(updateWithFeedback),
    }));
  },
}));
