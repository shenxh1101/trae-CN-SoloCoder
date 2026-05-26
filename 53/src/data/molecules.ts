import { MoleculeData } from '../types';

const BOND_LENGTH = {
  OH: 0.96,
  CO: 1.16,
  CH: 1.09,
};

export const PRESET_MOLECULES: MoleculeData[] = [
  {
    name: '水分子',
    formula: 'H₂O',
    atoms: [
      { id: 'O1', element: 'O', position: [0, 0, 0] },
      { id: 'H1', element: 'H', position: [BOND_LENGTH.OH, 0, 0] },
      {
        id: 'H2',
        element: 'H',
        position: [
          BOND_LENGTH.OH * Math.cos((104.5 * Math.PI) / 180),
          BOND_LENGTH.OH * Math.sin((104.5 * Math.PI) / 180),
          0,
        ],
      },
    ],
    bonds: [
      { from: 'O1', to: 'H1', order: 1 },
      { from: 'O1', to: 'H2', order: 1 },
    ],
    dipoleMoment: [0.5, 0.3, 0],
  },
  {
    name: '二氧化碳',
    formula: 'CO₂',
    atoms: [
      { id: 'C1', element: 'C', position: [0, 0, 0] },
      { id: 'O1', element: 'O', position: [-BOND_LENGTH.CO, 0, 0] },
      { id: 'O2', element: 'O', position: [BOND_LENGTH.CO, 0, 0] },
    ],
    bonds: [
      { from: 'C1', to: 'O1', order: 2 },
      { from: 'C1', to: 'O2', order: 2 },
    ],
    dipoleMoment: [0, 0, 0],
  },
  {
    name: '甲烷',
    formula: 'CH₄',
    atoms: [
      { id: 'C1', element: 'C', position: [0, 0, 0] },
      { id: 'H1', element: 'H', position: [BOND_LENGTH.CH, BOND_LENGTH.CH, BOND_LENGTH.CH] },
      { id: 'H2', element: 'H', position: [-BOND_LENGTH.CH, -BOND_LENGTH.CH, BOND_LENGTH.CH] },
      { id: 'H3', element: 'H', position: [BOND_LENGTH.CH, -BOND_LENGTH.CH, -BOND_LENGTH.CH] },
      { id: 'H4', element: 'H', position: [-BOND_LENGTH.CH, BOND_LENGTH.CH, -BOND_LENGTH.CH] },
    ],
    bonds: [
      { from: 'C1', to: 'H1', order: 1 },
      { from: 'C1', to: 'H2', order: 1 },
      { from: 'C1', to: 'H3', order: 1 },
      { from: 'C1', to: 'H4', order: 1 },
    ],
    dipoleMoment: [0, 0, 0],
  },
];
