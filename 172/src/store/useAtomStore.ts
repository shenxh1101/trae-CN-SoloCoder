import { create } from 'zustand';
import { elements, ElementData } from '../data/elements';

interface AtomState {
  selectedElement: string;
  electronSpeed: number;
  orbitRadiusScale: number;
  orbitEccentricity: number;
  nucleusSize: number;
  backgroundType: 'space' | 'black';
  showOrbitHighlight: boolean;
  autoRotate: boolean;
  selectedOrbitIndex: number | null;
  
  setSelectedElement: (element: string) => void;
  setElectronSpeed: (speed: number) => void;
  setOrbitRadiusScale: (scale: number) => void;
  setOrbitEccentricity: (eccentricity: number) => void;
  setNucleusSize: (size: number) => void;
  setBackgroundType: (type: 'space' | 'black') => void;
  setShowOrbitHighlight: (show: boolean) => void;
  setAutoRotate: (auto: boolean) => void;
  setSelectedOrbitIndex: (index: number | null) => void;
  
  getCurrentElement: () => ElementData;
}

export const useAtomStore = create<AtomState>((set, get) => ({
  selectedElement: 'hydrogen',
  electronSpeed: 1,
  orbitRadiusScale: 1,
  orbitEccentricity: 0.2,
  nucleusSize: 1,
  backgroundType: 'space',
  showOrbitHighlight: true,
  autoRotate: false,
  selectedOrbitIndex: null,

  setSelectedElement: (element) => set({ selectedElement: element }),
  setElectronSpeed: (speed) => set({ electronSpeed: speed }),
  setOrbitRadiusScale: (scale) => set({ orbitRadiusScale: scale }),
  setOrbitEccentricity: (eccentricity) => set({ orbitEccentricity: eccentricity }),
  setNucleusSize: (size) => set({ nucleusSize: size }),
  setBackgroundType: (type) => set({ backgroundType: type }),
  setShowOrbitHighlight: (show) => set({ showOrbitHighlight: show }),
  setAutoRotate: (auto) => set({ autoRotate: auto }),
  setSelectedOrbitIndex: (index) => set({ selectedOrbitIndex: index }),

  getCurrentElement: () => elements[get().selectedElement] || elements.hydrogen,
}));
