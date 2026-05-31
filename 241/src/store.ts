import { create } from 'zustand'
import type { TreeStore } from '@/types'

export const useTreeStore = create<TreeStore>((set) => ({
  breathValue: 0.5,
  breathMode: 'slider',
  treePreset: 'oak',
  windStrength: 0.2,
  lockedParts: [],
  autoRotate: true,
  cameraOrbitSpeed: 0.1,
  branchData: null,

  setBreathValue: (v) => set({ breathValue: Math.max(0, Math.min(1, v)) }),
  setBreathMode: (m) => set({ breathMode: m }),
  setTreePreset: (p) => set({ treePreset: p }),
  setWindStrength: (v) => set({ windStrength: Math.max(0, Math.min(1, v)) }),
  toggleLockedPart: (p) =>
    set((state) => ({
      lockedParts: state.lockedParts.includes(p)
        ? state.lockedParts.filter((x) => x !== p)
        : [...state.lockedParts, p],
    })),
  setAutoRotate: (v) => set({ autoRotate: v }),
  setCameraOrbitSpeed: (v) => set({ cameraOrbitSpeed: v }),
  setBranchData: (d) => set({ branchData: d }),
}))
