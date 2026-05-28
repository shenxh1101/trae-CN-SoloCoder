import { create } from 'zustand';
import { OceanState, OceanActions, BackgroundType, FishData } from '@/types';

type OceanStore = OceanState & OceanActions;

export const useOceanStore = create<OceanStore>((set) => ({
  backgroundType: 'deep',
  sunRaysEnabled: true,
  audioEnabled: false,
  bubbleCount: 100,
  bubbleDensity: 1,
  autoRotate: true,
  autoRotateSpeed: 0.3,
  selectedFish: null,
  fishCount: 0,
  planktonEnabled: true,

  setBackgroundType: (type: BackgroundType) => set({ backgroundType: type }),
  
  toggleSunRays: () => set((state) => ({ sunRaysEnabled: !state.sunRaysEnabled })),
  
  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),
  
  setBubbleCount: (count: number) => set({ bubbleCount: count }),
  
  setBubbleDensity: (density: number) => set({ bubbleDensity: density }),
  
  toggleAutoRotate: () => set((state) => ({ autoRotate: !state.autoRotate })),
  
  setAutoRotateSpeed: (speed: number) => set({ autoRotateSpeed: speed }),
  
  setSelectedFish: (fish: FishData | null) => set({ selectedFish: fish }),
  
  setFishCount: (count: number) => set({ fishCount: count }),
  
  togglePlankton: () => set((state) => ({ planktonEnabled: !state.planktonEnabled })),
  
  takeScreenshot: () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `ocean-world-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as any).__ZUSTAND_STORE__ = useOceanStore;
}
