export type FishType = 'clownfish' | 'angelfish' | 'butterflyfish';

export type BackgroundType = 'deep' | 'shallow' | 'night';

export interface FishData {
  id: string;
  type: FishType;
  name: string;
  description: string;
  color: string;
  secondaryColor: string;
  size: number;
  speed: number;
  pathRadius: number;
  pathHeight: number;
  pathOffset: number;
}

export interface OceanState {
  backgroundType: BackgroundType;
  sunRaysEnabled: boolean;
  audioEnabled: boolean;
  bubbleCount: number;
  bubbleDensity: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  selectedFish: FishData | null;
  fishCount: number;
  planktonEnabled: boolean;
}

export interface OceanActions {
  setBackgroundType: (type: BackgroundType) => void;
  toggleSunRays: () => void;
  toggleAudio: () => void;
  setBubbleCount: (count: number) => void;
  setBubbleDensity: (density: number) => void;
  toggleAutoRotate: () => void;
  setAutoRotateSpeed: (speed: number) => void;
  setSelectedFish: (fish: FishData | null) => void;
  setFishCount: (count: number) => void;
  togglePlankton: () => void;
  takeScreenshot: () => void;
}

export const BACKGROUND_COLORS: Record<BackgroundType, string> = {
  deep: '#0a1628',
  shallow: '#1a5a6e',
  night: '#050a12',
};

export const FOG_COLORS: Record<BackgroundType, string> = {
  deep: '#0a1628',
  shallow: '#1a5a6e',
  night: '#050a12',
};
