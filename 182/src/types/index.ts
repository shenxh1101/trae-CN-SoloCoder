export type Face = 'U' | 'R' | 'L' | 'B';

export type Color = 'red' | 'blue' | 'green' | 'yellow';

export type PieceType = 'tip' | 'edge' | 'center';

export type MoveType = 'tip' | 'middle' | 'face';

export type Direction = 'clockwise' | 'counterclockwise';

export type StyleType = 'standard' | 'neon' | 'metallic';

export type FaceletPosition = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Facelet {
  face: Face;
  position: FaceletPosition;
  color: Color;
}

export interface Piece {
  id: string;
  type: PieceType;
  position: [number, number, number];
  rotation: [number, number, number];
  facelets: Facelet[];
  homePosition: [number, number, number];
  homeFacelets: Facelet[];
}

export interface Move {
  type: MoveType;
  face: Face;
  direction: Direction;
  timestamp?: number;
  animated?: boolean;
}

export interface PyraminxState {
  pieces: Piece[];
  isSolved: boolean;
  moveHistory: Move[];
}

export interface AppState {
  timer: number;
  timerRunning: boolean;
  isShuffled: boolean;
  style: StyleType;
  showEdges: boolean;
  autoRotate: boolean;
  isAnimating: boolean;
}

export const FACE_COLORS: { [key in Face]: Color } = {
  U: 'yellow',
  R: 'red',
  L: 'blue',
  B: 'green',
};

export const COLOR_HEX: { [key in Color]: { standard: string; neon: string; metallic: string } } = {
  red: {
    standard: '#e74c3c',
    neon: '#ff0040',
    metallic: '#b03030',
  },
  blue: {
    standard: '#3498db',
    neon: '#00aaff',
    metallic: '#256090',
  },
  green: {
    standard: '#2ecc71',
    neon: '#00ff88',
    metallic: '#208050',
  },
  yellow: {
    standard: '#f1c40f',
    neon: '#ffff00',
    metallic: '#c0a020',
  },
};

export const FACE_LABELS: { [key in Face]: string } = {
  U: '顶',
  R: '右',
  L: '左',
  B: '后',
};

export const MOVE_TYPE_LABELS: { [key in MoveType]: string } = {
  tip: '顶点',
  middle: '中层',
  face: '整面',
};

export const DIRECTION_LABELS: { [key in Direction]: string } = {
  clockwise: '顺',
  counterclockwise: '逆',
};

export const FACE_NORMAL: { [key in Face]: [number, number, number] } = {
  U: [0, 1, 0],
  R: [0.577, -0.577, 0.577],
  L: [-0.577, -0.577, 0.577],
  B: [0, -0.577, -0.816],
};

export const TETRAHEDRON_VERTICES: { [key in Face]: [number, number, number] } = {
  U: [0, 1.5, 0],
  R: [1.41421356, -0.5, 0],
  L: [-0.70710678, -0.5, 1.22474487],
  B: [-0.70710678, -0.5, -1.22474487],
};
