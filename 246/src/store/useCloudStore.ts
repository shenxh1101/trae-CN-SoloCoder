import { create } from 'zustand';
import type { CloudPreset, CameraMode, MusicType, PoemAnalysis } from '@/types';
import { parsePoem } from '@/utils/poemParser';

interface CloudStore {
  poem: string;
  analysis: PoemAnalysis;
  cloudPreset: CloudPreset;
  cameraMode: CameraMode;
  cameraPosition: [number, number, number];
  musicEnabled: boolean;
  musicType: MusicType;
  showBirds: boolean;
  showButterflies: boolean;
  isRecording: boolean;
  setPoem: (poem: string) => void;
  setCloudPreset: (preset: CloudPreset) => void;
  setCameraMode: (mode: CameraMode) => void;
  setCameraPosition: (x: number, y: number, z: number) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setMusicType: (type: MusicType) => void;
  setShowBirds: (show: boolean) => void;
  setShowButterflies: (show: boolean) => void;
  setIsRecording: (recording: boolean) => void;
}

const defaultPoem = '落霞与孤鹜齐飞';

export const useCloudStore = create<CloudStore>((set) => ({
  poem: defaultPoem,
  analysis: parsePoem(defaultPoem),
  cloudPreset: 'cumulus',
  cameraMode: 'orbit',
  cameraPosition: [0, 20, 40],
  musicEnabled: false,
  musicType: 'guqin',
  showBirds: true,
  showButterflies: false,
  isRecording: false,
  setPoem: (poem) => set({ poem, analysis: parsePoem(poem) }),
  setCloudPreset: (cloudPreset) => set({ cloudPreset }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setCameraPosition: (x, y, z) => set({ cameraPosition: [x, y, z] }),
  setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
  setMusicType: (musicType) => set({ musicType }),
  setShowBirds: (showBirds) => set({ showBirds }),
  setShowButterflies: (showButterflies) => set({ showButterflies }),
  setIsRecording: (isRecording) => set({ isRecording }),
}));

if (typeof window !== 'undefined') {
  (window as any).cloudStore = useCloudStore;
}
