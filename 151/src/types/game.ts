export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Platform {
  position: Vector3
  size: Vector3
  color?: string
}

export interface TargetPoint {
  id: number
  position: Vector3
  reached: boolean
}

export interface Star {
  id: number
  position: Vector3
  collected: boolean
}

export interface Wind {
  enabled: boolean
  direction: Vector3
  strength: number
}

export interface Level {
  id: number
  name: string
  platforms: Platform[]
  targets: TargetPoint[]
  stars: Star[]
  startPosition: Vector3
  wind: Wind
  isCustom?: boolean
}

export interface GameState {
  currentLevel: number
  totalLevels: number
  isPlaying: boolean
  isPaused: boolean
  isGameOver: boolean
  isLevelComplete: boolean
  jumpCount: number
  currentTime: number
  totalTime: number
  bestTimes: Record<number, number>
  bestJumps: Record<number, number>
  ballPosition: Vector3
  ballVelocity: Vector3
  isGrounded: boolean
  isCharging: boolean
  chargePower: number
  jumpDirection: Vector3
  soundEnabled: boolean
  showEditor: boolean
  customLevels: Level[]
  editorMode: 'platform' | 'target' | 'star' | 'none'
}

export interface GameActions {
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  resetLevel: () => void
  nextLevel: () => void
  setCurrentLevel: (level: number) => void
  incrementJumpCount: () => void
  updateTime: (delta: number) => void
  setBallPosition: (pos: Vector3) => void
  setBallVelocity: (vel: Vector3) => void
  setIsGrounded: (grounded: boolean) => void
  setIsCharging: (charging: boolean) => void
  setChargePower: (power: number) => void
  setJumpDirection: (dir: Vector3) => void
  targetReached: (targetId: number) => void
  starCollected: (starId: number) => void
  gameOver: () => void
  levelComplete: () => void
  toggleSound: () => void
  toggleEditor: () => void
  setEditorMode: (mode: 'platform' | 'target' | 'star' | 'none') => void
  saveCustomLevel: (level: Level) => void
  deleteCustomLevel: (levelId: number) => void
  loadBestScores: () => void
  setIsPlaying: (playing: boolean) => void
  setIsGameOver: (over: boolean) => void
  setIsLevelComplete: (complete: boolean) => void
}
