import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GameState, GameActions, Level, Vector3 } from '@/types/game'
import { defaultLevels, cloneLevel } from '@/data/levels'

const initialState: Omit<GameState, keyof GameActions> = {
  currentLevel: 0,
  totalLevels: defaultLevels.length,
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  isLevelComplete: false,
  jumpCount: 0,
  currentTime: 0,
  totalTime: 0,
  bestTimes: {},
  bestJumps: {},
  ballPosition: { x: 0, y: 2, z: 0 },
  ballVelocity: { x: 0, y: 0, z: 0 },
  isGrounded: true,
  isCharging: false,
  chargePower: 0,
  jumpDirection: { x: 0, y: 0, z: -1 },
  soundEnabled: true,
  showEditor: false,
  customLevels: [],
  editorMode: 'none',
}

export const useStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      startGame: () => {
        const state = get()
        const allLevels = [...defaultLevels, ...state.customLevels]
        const level = allLevels[state.currentLevel]
        set({
          isPlaying: true,
          isPaused: false,
          isGameOver: false,
          isLevelComplete: false,
          jumpCount: 0,
          currentTime: 0,
          ballPosition: { ...level.startPosition },
          ballVelocity: { x: 0, y: 0, z: 0 },
          isGrounded: true,
          isCharging: false,
          chargePower: 0,
        })
      },

      pauseGame: () => set({ isPaused: true }),
      resumeGame: () => set({ isPaused: false }),

      resetLevel: () => {
        const state = get()
        const allLevels = [...defaultLevels, ...state.customLevels]
        const level = cloneLevel(allLevels[state.currentLevel])
        set({
          isGameOver: false,
          isLevelComplete: false,
          jumpCount: 0,
          currentTime: 0,
          ballPosition: { ...level.startPosition },
          ballVelocity: { x: 0, y: 0, z: 0 },
          isGrounded: true,
          isCharging: false,
          chargePower: 0,
        })
      },

      nextLevel: () => {
        const state = get()
        const allLevels = [...defaultLevels, ...state.customLevels]
        const nextLevelIndex = state.currentLevel + 1
        if (nextLevelIndex < allLevels.length) {
          const level = cloneLevel(allLevels[nextLevelIndex])
          set({
            currentLevel: nextLevelIndex,
            isLevelComplete: false,
            jumpCount: 0,
            currentTime: 0,
            ballPosition: { ...level.startPosition },
            ballVelocity: { x: 0, y: 0, z: 0 },
            isGrounded: true,
            isCharging: false,
            chargePower: 0,
          })
        }
      },

      setCurrentLevel: (levelIndex: number) => {
        const state = get()
        const allLevels = [...defaultLevels, ...state.customLevels]
        if (levelIndex >= 0 && levelIndex < allLevels.length) {
          const level = cloneLevel(allLevels[levelIndex])
          set({
            currentLevel: levelIndex,
            isPlaying: false,
            isGameOver: false,
            isLevelComplete: false,
            jumpCount: 0,
            currentTime: 0,
            ballPosition: { ...level.startPosition },
            ballVelocity: { x: 0, y: 0, z: 0 },
            isGrounded: true,
          })
        }
      },

      incrementJumpCount: () => set((state) => ({ jumpCount: state.jumpCount + 1 })),

      updateTime: (delta: number) =>
        set((state) => ({
          currentTime: state.currentTime + delta,
          totalTime: state.totalTime + delta,
        })),

      setBallPosition: (pos: Vector3) => set({ ballPosition: pos }),
      setBallVelocity: (vel: Vector3) => set({ ballVelocity: vel }),
      setIsGrounded: (grounded: boolean) => set({ isGrounded: grounded }),
      setIsCharging: (charging: boolean) => set({ isCharging: charging }),
      setChargePower: (power: number) => set({ chargePower: power }),
      setJumpDirection: (dir: Vector3) => set({ jumpDirection: dir }),

      targetReached: (targetId: number) => {
        // This will be handled in the game component to update the level data
      },

      starCollected: (starId: number) => {
        // This will be handled in the game component to update the level data
      },

      gameOver: () => {
        const state = get()
        set({
          isGameOver: true,
          isPlaying: false,
        })
      },

      levelComplete: () => {
        const state = get()
        const levelIndex = state.currentLevel
        const newBestTimes = { ...state.bestTimes }
        const newBestJumps = { ...state.bestJumps }

        if (!newBestTimes[levelIndex] || state.currentTime < newBestTimes[levelIndex]) {
          newBestTimes[levelIndex] = state.currentTime
        }
        if (!newBestJumps[levelIndex] || state.jumpCount < newBestJumps[levelIndex]) {
          newBestJumps[levelIndex] = state.jumpCount
        }

        set({
          isLevelComplete: true,
          isPlaying: false,
          bestTimes: newBestTimes,
          bestJumps: newBestJumps,
        })
      },

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleEditor: () => set((state) => ({ showEditor: !state.showEditor })),
      setEditorMode: (mode) => set({ editorMode: mode }),

      saveCustomLevel: (level: Level) => {
        set((state) => ({
          customLevels: [...state.customLevels, { ...level, isCustom: true }],
          totalLevels: defaultLevels.length + state.customLevels.length + 1,
        }))
      },

      deleteCustomLevel: (levelId: number) => {
        set((state) => {
          const newCustomLevels = state.customLevels.filter((l) => l.id !== levelId)
          const newCurrentLevel =
            state.currentLevel >= defaultLevels.length
              ? Math.min(state.currentLevel, defaultLevels.length + newCustomLevels.length - 1)
              : state.currentLevel
          return {
            customLevels: newCustomLevels,
            totalLevels: defaultLevels.length + newCustomLevels.length,
            currentLevel: Math.max(0, newCurrentLevel),
          }
        })
      },

      loadBestScores: () => {
        // Scores are loaded via persist middleware
      },

      setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
      setIsGameOver: (over: boolean) => set({ isGameOver: over }),
      setIsLevelComplete: (complete: boolean) => set({ isLevelComplete: complete }),
    }),
    {
      name: 'jump-ball-game-storage',
      partialize: (state) => ({
        bestTimes: state.bestTimes,
        bestJumps: state.bestJumps,
        customLevels: state.customLevels,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
)
