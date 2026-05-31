export type BreathMode = 'camera' | 'manual' | 'slider'
export type TreePreset = 'oak' | 'willow' | 'cherry'
export type LockablePart = 'trunk' | 'branches' | 'leaves'

export interface TreePresetConfig {
  name: string
  label: string
  branchAngle: [number, number]
  branchLength: [number, number]
  trunkThickness: number
  trunkTwist: number
  leafColor: string
  leafSize: number
  branchDensity: number
  droopFactor: number
  maxDepth: number
}

export interface BranchData {
  id: string
  startPoint: [number, number, number]
  endPoint: [number, number, number]
  thickness: number
  children: BranchData[]
  depth: number
  locked: boolean
}

export const TREE_PRESETS: Record<TreePreset, TreePresetConfig> = {
  oak: {
    name: 'oak',
    label: '橡树',
    branchAngle: [25, 45],
    branchLength: [1.5, 3.0],
    trunkThickness: 0.5,
    trunkTwist: 0.3,
    leafColor: '#4ade80',
    leafSize: 0.3,
    branchDensity: 3,
    droopFactor: 0.0,
    maxDepth: 4,
  },
  willow: {
    name: 'willow',
    label: '柳树',
    branchAngle: [15, 35],
    branchLength: [2.0, 4.0],
    trunkThickness: 0.3,
    trunkTwist: 0.5,
    leafColor: '#86efac',
    leafSize: 0.15,
    branchDensity: 3,
    droopFactor: 0.6,
    maxDepth: 4,
  },
  cherry: {
    name: 'cherry',
    label: '樱花树',
    branchAngle: [30, 55],
    branchLength: [1.0, 2.5],
    trunkThickness: 0.25,
    trunkTwist: 0.2,
    leafColor: '#f9a8d4',
    leafSize: 0.2,
    branchDensity: 3,
    maxDepth: 4,
    droopFactor: 0.1,
  },
}

export interface TreeStore {
  breathValue: number
  breathMode: BreathMode
  treePreset: TreePreset
  windStrength: number
  lockedParts: LockablePart[]
  autoRotate: boolean
  cameraOrbitSpeed: number
  branchData: BranchData | null

  setBreathValue: (v: number) => void
  setBreathMode: (m: BreathMode) => void
  setTreePreset: (p: TreePreset) => void
  setWindStrength: (v: number) => void
  toggleLockedPart: (p: LockablePart) => void
  setAutoRotate: (v: boolean) => void
  setCameraOrbitSpeed: (v: number) => void
  setBranchData: (d: BranchData | null) => void
}
