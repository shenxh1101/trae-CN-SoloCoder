export interface OrbitConfig {
  radius: number;
  inclination: number;
  electronCount: number;
  electronColor: string;
}

export interface ElementData {
  name: string;
  symbol: string;
  atomicNumber: number;
  atomicMass: number;
  electronConfiguration: string;
  nucleusColor: string;
  orbits: OrbitConfig[];
}

export const elements: Record<string, ElementData> = {
  hydrogen: {
    name: '氢',
    symbol: 'H',
    atomicNumber: 1,
    atomicMass: 1.008,
    electronConfiguration: '1s¹',
    nucleusColor: '#ff6b6b',
    orbits: [
      { radius: 2, inclination: 0, electronCount: 1, electronColor: '#ff6b6b' }
    ]
  },
  carbon: {
    name: '碳',
    symbol: 'C',
    atomicNumber: 6,
    atomicMass: 12.011,
    electronConfiguration: '[He] 2s² 2p²',
    nucleusColor: '#4ecdc4',
    orbits: [
      { radius: 2, inclination: 0, electronCount: 2, electronColor: '#ff6b6b' },
      { radius: 3.5, inclination: 0.4, electronCount: 4, electronColor: '#ffd93d' }
    ]
  },
  oxygen: {
    name: '氧',
    symbol: 'O',
    atomicNumber: 8,
    atomicMass: 15.999,
    electronConfiguration: '[He] 2s² 2p⁴',
    nucleusColor: '#ff6b6b',
    orbits: [
      { radius: 2, inclination: 0, electronCount: 2, electronColor: '#ff6b6b' },
      { radius: 3.5, inclination: 0.4, electronCount: 6, electronColor: '#ffd93d' }
    ]
  },
  gold: {
    name: '金',
    symbol: 'Au',
    atomicNumber: 79,
    atomicMass: 196.967,
    electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹',
    nucleusColor: '#ffd700',
    orbits: [
      { radius: 1.5, inclination: 0, electronCount: 2, electronColor: '#ff6b6b' },
      { radius: 2.5, inclination: 0.3, electronCount: 8, electronColor: '#ffd93d' },
      { radius: 3.8, inclination: 0.6, electronCount: 18, electronColor: '#6bcb77' },
      { radius: 5, inclination: 0.9, electronCount: 32, electronColor: '#4ecdc4' },
      { radius: 6.2, inclination: 1.2, electronCount: 18, electronColor: '#a855f7' },
      { radius: 7.5, inclination: 1.5, electronCount: 1, electronColor: '#ec4899' }
    ]
  }
};
