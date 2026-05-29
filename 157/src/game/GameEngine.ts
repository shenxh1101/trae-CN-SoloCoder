import { GameState, JudgeResult, Note, Song } from '../types/game';
import {
  HEALTH_CONFIG, JUDGE_WINDOWS, SCORE_CONFIG } from '../config/gameConfig';

type UpdateCallback = (state: GameState) => void;
type JudgeCallback = (result: JudgeResult, direction: string) => void;
type EndCallback = () => void;

export class GameEngine {
  private song: Song;
  private notes: Note[];
  private state: GameState;
  private startTime: number = 0;
  private animationFrameId: number | null = null;
  private updateCallback: UpdateCallback | null = null;
  private judgeCallback: JudgeCallback | null = null;
  private endCallback: EndCallback | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private hitNotes: Set<string> = new Set();
  private missedNotes: Set<string> = new Set();

  constructor(song: Song, audioUrl?: string) {
    this.song = song;
    this.notes = [...song.notes];
    this.state = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      health: HEALTH_CONFIG.max,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
    };

    if (audioUrl) {
      this.audioElement = new Audio(audioUrl);
    }
  }

  onUpdate(callback: UpdateCallback): void {
    this.updateCallback = callback;
  }

  onJudge(callback: JudgeCallback): void {
    this.judgeCallback = callback;
  }

  onEnd(callback: EndCallback): void {
    this.endCallback = callback;
  }

  start(): void {
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.startTime = performance.now();
    
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.play().catch(() => {});
    }
    
    this.gameLoop();
  }

  pause(): void {
    this.state.isPaused = true;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume(): void {
    this.state.isPaused = false;
    this.startTime = performance.now() - this.state.currentTime;
    if (this.audioElement) {
      this.audioElement.play().catch(() => {});
    }
    this.gameLoop();
  }

  stop(): void {
    this.state.isPlaying = false;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (): void => {
    if (this.state.isPaused || !this.state.isPlaying) return;

    const currentTime = performance.now() - this.startTime;
    this.state.currentTime = currentTime;

    this.checkMissedNotes(currentTime);

    if (currentTime >= this.song.duration || this.state.health <= 0) {
      this.stop();
      this.endCallback?.();
      return;
    }

    this.updateCallback?.(this.state);
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private checkMissedNotes(currentTime: number): void {
    for (const note of this.notes) {
      if (this.hitNotes.has(note.id)) continue;
      if (this.missedNotes.has(note.id)) continue;
      
      const timeDiff = currentTime - note.time;
      
      if (timeDiff > JUDGE_WINDOWS.good) {
        this.missedNotes.add(note.id);
        this.handleJudge('miss', note.direction);
      }
    }
  }

  handleKeyPress(direction: string): JudgeResult | null {
    if (!this.state.isPlaying || this.state.isPaused) return null;

    const currentTime = performance.now() - this.startTime;
    
    let closestNote: Note | null = null;
    let closestDiff = Infinity;

    for (const note of this.notes) {
      if (note.direction !== direction) continue;
      if (this.hitNotes.has(note.id)) continue;
      if (this.missedNotes.has(note.id)) continue;

      const timeDiff = Math.abs(currentTime - note.time);
      if (timeDiff < closestDiff && timeDiff <= JUDGE_WINDOWS.good) {
        closestDiff = timeDiff;
        closestNote = note;
      }
    }

    if (!closestNote) return null;

    this.hitNotes.add(closestNote.id);

    let result: JudgeResult;
    if (closestDiff <= JUDGE_WINDOWS.perfect) {
      result = 'perfect';
    } else {
      result = 'good';
    }

    this.handleJudge(result, direction);
    return result;
  }

  private handleJudge(result: JudgeResult, direction: string): void {
    if (result === 'perfect') {
      this.state.perfectCount++;
      this.state.combo++;
      this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
      this.state.score += SCORE_CONFIG.perfect + this.state.combo * SCORE_CONFIG.comboBonus;
      this.state.health = Math.min(HEALTH_CONFIG.max, this.state.health + HEALTH_CONFIG.perfectHeal);
    } else if (result === 'good') {
      this.state.goodCount++;
      this.state.combo++;
      this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
      this.state.score += SCORE_CONFIG.good + this.state.combo * SCORE_CONFIG.comboBonus;
      this.state.health = Math.min(HEALTH_CONFIG.max, this.state.health + HEALTH_CONFIG.goodHeal);
    } else {
      this.state.missCount++;
      this.state.combo = 0;
      this.state.health = Math.max(0, this.state.health - HEALTH_CONFIG.missDamage);
    }

    this.judgeCallback?.(result, direction);
  }

  getState(): GameState {
    return { ...this.state };
  }

  getVisibleNotes(currentTime: number, noteSpeed: number, canvasHeight: number): Array<Note & { y: number }> {
    const visibleNotes: Array<Note & { y: number }> = [];
    
    for (const note of this.notes) {
      if (this.hitNotes.has(note.id)) continue;
      
      const timeUntilJudge = note.time - currentTime;
      const y = 100 + (timeUntilJudge / 1000) * noteSpeed;
      
      if (y >= -100 && y <= canvasHeight + 100) {
        visibleNotes.push({
          ...note,
          y,
        });
      }
    }
    
    return visibleNotes;
  }

  destroy(): void {
    this.stop();
    if (this.audioElement) {
      this.audioElement.src = '';
    }
  }
}
