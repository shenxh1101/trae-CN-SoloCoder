import { create } from 'zustand';

export interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  population: number;
}

interface SceneState {
  rotationSpeed: number;
  showGrid: boolean;
  isAnimating: boolean;
  currentTargetCity: City | null;
  fps: number;
  cameraPosition: { x: number; y: number; z: number };
  hoveredCity: City | null;
  mousePosition: { x: number; y: number };
  sunPosition: { x: number; y: number; z: number };

  setRotationSpeed: (speed: number) => void;
  toggleGrid: () => void;
  setIsAnimating: (animating: boolean) => void;
  setCurrentTargetCity: (city: City | null) => void;
  setFps: (fps: number) => void;
  setCameraPosition: (pos: { x: number; y: number; z: number }) => void;
  setHoveredCity: (city: City | null) => void;
  setMousePosition: (pos: { x: number; y: number }) => void;
  setSunPosition: (pos: { x: number; y: number; z: number }) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  rotationSpeed: 0.2,
  showGrid: true,
  isAnimating: false,
  currentTargetCity: null,
  fps: 0,
  cameraPosition: { x: 0, y: 0, z: 6 },
  hoveredCity: null,
  mousePosition: { x: 0, y: 0 },
  sunPosition: { x: 5, y: 2, z: 5 },

  setRotationSpeed: (speed) => set({ rotationSpeed: speed }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setIsAnimating: (animating) => set({ isAnimating: animating }),
  setCurrentTargetCity: (city) => set({ currentTargetCity: city }),
  setFps: (fps) => set({ fps }),
  setCameraPosition: (pos) => set({ cameraPosition: pos }),
  setHoveredCity: (city) => set({ hoveredCity: city }),
  setMousePosition: (pos) => set({ mousePosition: pos }),
  setSunPosition: (pos) => set({ sunPosition: pos }),
}));
