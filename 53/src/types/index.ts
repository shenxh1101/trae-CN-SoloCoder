export type Element = 'H' | 'O' | 'C' | 'N' | 'S' | 'P';

export interface Atom {
  id: string;
  element: Element;
  position: [number, number, number];
}

export interface Bond {
  from: string;
  to: string;
  order: 1 | 2 | 3;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: Atom[];
  bonds: Bond[];
  dipoleMoment?: [number, number, number];
}

export interface DisplayOptions {
  showLabels: boolean;
  showVanDerWaals: boolean;
  showElectronCloud: boolean;
  showDipoleMoment: boolean;
  autoRotate: boolean;
}

export type BackgroundType = 'white' | 'black' | 'gradient';

export interface MeasurementResult {
  atom1: string;
  atom2: string;
  distance: number;
}

export interface MoleculeSize {
  width: number;
  height: number;
  depth: number;
}

export const ELEMENT_COLORS: Record<Element, string> = {
  H: '#ffffff',
  O: '#ff4444',
  C: '#808080',
  N: '#4444ff',
  S: '#ffff44',
  P: '#ffaa44',
};

export const ELEMENT_RADIUS: Record<Element, number> = {
  H: 0.32,
  O: 0.64,
  C: 0.75,
  N: 0.71,
  S: 1.02,
  P: 1.06,
};

export const VAN_DER_WAALS_RADIUS: Record<Element, number> = {
  H: 1.2,
  O: 1.52,
  C: 1.7,
  N: 1.55,
  S: 1.8,
  P: 1.8,
};

export const ELEMENT_NAMES: Record<Element, string> = {
  H: '氢',
  O: '氧',
  C: '碳',
  N: '氮',
  S: '硫',
  P: '磷',
};

export const ELECTRONEGATIVITY: Record<Element, number> = {
  H: 2.20,
  O: 3.44,
  C: 2.55,
  N: 3.04,
  S: 2.58,
  P: 2.19,
};

export const ATOMIC_WEIGHT: Record<Element, number> = {
  H: 1.008,
  O: 15.999,
  C: 12.011,
  N: 14.007,
  S: 32.06,
  P: 30.974,
};
