import { create } from 'zustand';
import {
  BodyPartType,
  CreatureActions,
  CreatureGenome,
  CreatureState,
} from '../types/creature';
import { generateRandomGenome } from '../utils/genetics';
import { evolveCreature } from '../utils/evolution';
import { exportAsJSON } from '../utils/exportUtils';

const initialState: CreatureState = {
  currentCreature: null,
  evolutionHistory: [],
  lockedParts: new Set<BodyPartType>(),
  evolutionBias: 'neutral',
  autoRotate: true,
  animationEnabled: true,
  isEvolving: false,
  feedbackEffect: null,
};

export const useCreatureStore = create<CreatureState & CreatureActions>((set, get) => ({
  ...initialState,

  initCreature: () => {
    const creature = generateRandomGenome(1);
    set({
      currentCreature: creature,
      evolutionHistory: [creature],
      evolutionBias: 'neutral',
    });
  },

  evolve: () => {
    const state = get();
    if (!state.currentCreature || state.isEvolving) return;

    set({ isEvolving: true });

    setTimeout(() => {
      const { currentCreature, evolutionBias, lockedParts, evolutionHistory } = get();
      if (!currentCreature) return;

      const newCreature = evolveCreature(currentCreature, evolutionBias, lockedParts);
      newCreature.parts = newCreature.parts.map((part) => ({
        ...part,
        locked: lockedParts.has(part.type),
      }));

      set({
        currentCreature: newCreature,
        evolutionHistory: [...evolutionHistory, newCreature],
        evolutionBias: 'neutral',
        isEvolving: false,
        feedbackEffect: null,
      });
    }, 800);
  },

  like: () => {
    set({ evolutionBias: 'conservative', feedbackEffect: 'like' });
    setTimeout(() => set({ feedbackEffect: null }), 1000);
  },

  dislike: () => {
    set({ evolutionBias: 'radical', feedbackEffect: 'dislike' });
    setTimeout(() => set({ feedbackEffect: null }), 1000);
  },

  toggleLock: (part: BodyPartType) => {
    const { lockedParts, currentCreature } = get();
    const newLocked = new Set(lockedParts);

    if (newLocked.has(part)) {
      newLocked.delete(part);
    } else {
      newLocked.add(part);
    }

    if (currentCreature) {
      const updatedCreature = {
        ...currentCreature,
        parts: currentCreature.parts.map((p) => ({
          ...p,
          locked: newLocked.has(p.type),
        })),
      };
      set({
        lockedParts: newLocked,
        currentCreature: updatedCreature,
      });
    } else {
      set({ lockedParts: newLocked });
    }
  },

  loadCreature: (genome: CreatureGenome) => {
    const { evolutionHistory } = get();
    const newLocked = new Set<BodyPartType>();
    genome.parts.forEach((p) => {
      if (p.locked) newLocked.add(p.type);
    });

    set({
      currentCreature: genome,
      evolutionHistory: [...evolutionHistory, genome],
      lockedParts: newLocked,
      evolutionBias: 'neutral',
    });
  },

  saveCreature: () => {
    const { currentCreature } = get();
    if (!currentCreature) return;
    exportAsJSON(currentCreature);
  },

  toggleAutoRotate: () =>
    set((state) => ({
      autoRotate: !state.autoRotate,
    })),

  toggleAnimation: () =>
    set((state) => ({
      animationEnabled: !state.animationEnabled,
    })),

  clearFeedback: () => set({ feedbackEffect: null }),
}));

export async function loadCreatureFromFile(): Promise<void> {
  const { triggerFileInput, importFromJSON } = await import('../utils/exportUtils');
  try {
    const file = await triggerFileInput('.json');
    const genome = await importFromJSON(file);
    useCreatureStore.getState().loadCreature(genome);
  } catch {
    // user cancelled or error
  }
}
