import { create } from 'zustand';
import type { AppState, ArtStyle, CubeFace } from '../types';
import { getDefaultFaceStyles } from '../data/styles';

interface AppActions {
  setStyleIntensity: (intensity: number) => void;
  setFaceStyle: (face: CubeFace, style: ArtStyle) => void;
  setSelectedFace: (face: CubeFace) => void;
  setContentImage: (image: string | null) => void;
  setBackgroundType: (type: 'solid' | 'stars') => void;
  setAutoRotate: (auto: boolean) => void;
  setRotationSpeed: (speed: number) => void;
  resetToDefaults: () => void;
}

export const useAppStore = create<AppState & AppActions>((set) => ({
  styleIntensity: 0.7,
  faceStyles: getDefaultFaceStyles(),
  selectedFace: 'front',
  contentImage: null,
  backgroundType: 'stars',
  autoRotate: true,
  rotationSpeed: 0.5,

  setStyleIntensity: (intensity) => set({ styleIntensity: intensity }),
  setFaceStyle: (face, style) =>
    set((state) => ({
      faceStyles: {
        ...state.faceStyles,
        [face]: style,
      },
    })),
  setSelectedFace: (face) => set({ selectedFace: face }),
  setContentImage: (image) => set({ contentImage: image }),
  setBackgroundType: (type) => set({ backgroundType: type }),
  setAutoRotate: (auto) => set({ autoRotate: auto }),
  setRotationSpeed: (speed) => set({ rotationSpeed: speed }),
  resetToDefaults: () =>
    set({
      styleIntensity: 0.7,
      faceStyles: getDefaultFaceStyles(),
      contentImage: null,
      autoRotate: true,
      rotationSpeed: 0.5,
    }),
}));
