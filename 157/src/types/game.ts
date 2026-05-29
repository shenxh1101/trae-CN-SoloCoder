export type Direction = 'up' | 'down' | 'left' | 'right';

export type JudgeResult = 'perfect' | 'good' | 'miss';

export interface Note {
  id: string;
  direction: Direction;
  time: number;
  hit?: JudgeResult;
}

export interface Song {
  id: string;
  name: string;
  bpm: number;
  duration: number;
  notes: Note[];
  audioUrl?: string;
  isCustom?: boolean;
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  health: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
}

export interface HighScore {
  songId: string;
  score: number;
  grade: string;
  date: string;
}

export interface GameResult {
  score: number;
  maxCombo: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  accuracy: number;
  grade: string;
  isNewRecord: boolean;
}
