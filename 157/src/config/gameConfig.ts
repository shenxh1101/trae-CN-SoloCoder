export const JUDGE_WINDOWS = {
  perfect: 50,
  good: 120,
} as const;

export const SCORE_CONFIG = {
  perfect: 100,
  good: 50,
  miss: 0,
  comboBonus: 10,
} as const;

export const HEALTH_CONFIG = {
  max: 100,
  missDamage: 15,
  goodHeal: 2,
  perfectHeal: 5,
} as const;

export const GAME_CONFIG = {
  noteSpeed: 400,
  judgeLineY: 100,
  trackCount: 4,
  noteHeight: 60,
  noteWidth: 70,
  trackWidth: 80,
} as const;

export const STORAGE_KEYS = {
  HIGH_SCORES: 'rhythm_game_high_scores',
  CUSTOM_SONGS: 'rhythm_game_custom_songs',
} as const;

export const DIRECTIONS: ('up' | 'down' | 'left' | 'right')[] = ['left', 'down', 'up', 'right'];

export const KEY_MAP: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

export function getGrade(accuracy: number): string {
  if (accuracy >= 95) return 'S';
  if (accuracy >= 90) return 'A';
  if (accuracy >= 80) return 'B';
  if (accuracy >= 70) return 'C';
  if (accuracy >= 60) return 'D';
  return 'F';
}

export function calculateAccuracy(perfect: number, good: number, total: number): number {
  if (total === 0) return 0;
  return ((perfect * 100 + good * 50) / (total * 100)) * 100;
}
