import { create } from 'zustand';
import { Piece, Move, StyleType, Direction, MoveType, Face } from '../types';
import {
  createInitialPieces,
  applyMove,
  shufflePieces,
  checkSolved,
  generateSolution,
} from '../engine/pyraminxEngine';

interface AppStore {
  pieces: Piece[];
  moveHistory: Move[];
  isSolved: boolean;
  timer: number;
  timerRunning: boolean;
  isShuffled: boolean;
  style: StyleType;
  showEdges: boolean;
  autoRotate: boolean;
  isAnimating: boolean;
  solutionMoves: Move[];
  isAutoSolving: boolean;
  isManuallyStopped: boolean;

  initialize: () => void;
  shuffle: () => void;
  makeMove: (face: Face, direction: Direction, type: MoveType, animate?: boolean) => void;
  autoSolve: () => void;
  manualSolveCheck: () => void;
  stopTimer: () => void;
  reset: () => void;
  setStyle: (style: StyleType) => void;
  setShowEdges: (show: boolean) => void;
  setAutoRotate: (auto: boolean) => void;
  setTimer: (timer: number) => void;
  setTimerRunning: (running: boolean) => void;
  setIsAnimating: (animating: boolean) => void;
  saveState: () => string;
  loadState: (json: string) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  pieces: createInitialPieces(),
  moveHistory: [],
  isSolved: true,
  timer: 0,
  timerRunning: false,
  isShuffled: false,
  style: 'standard',
  showEdges: true,
  autoRotate: false,
  isAnimating: false,
  solutionMoves: [],
  isAutoSolving: false,
  isManuallyStopped: false,

  initialize: () => {
    set({ pieces: createInitialPieces(), isSolved: true });
  },

  shuffle: () => {
    const { pieces } = get();
    const { pieces: newPieces, moves } = shufflePieces(pieces, 25);
    
    const solution = generateSolution(newPieces);
    
    set({
      pieces: newPieces,
      moveHistory: moves,
      isSolved: false,
      isShuffled: true,
      timer: 0,
      timerRunning: true,
      solutionMoves: solution,
      isManuallyStopped: false,
    });
  },

  makeMove: (face: Face, direction: Direction, type: MoveType, animate = true) => {
    const { pieces, isSolved, timerRunning, isManuallyStopped } = get();

    if (isSolved && !timerRunning) {
      set({ timerRunning: true, isManuallyStopped: false });
    }

    const newPieces = applyMove(pieces, face, direction, type);
    const solved = checkSolved(newPieces);

    const newMove: Move = {
      type,
      face,
      direction,
      timestamp: Date.now(),
      animated: animate,
    };

    const shouldStopTimer = solved && !isManuallyStopped;

    set(state => ({
      pieces: newPieces,
      moveHistory: [...state.moveHistory, newMove],
      isSolved: solved,
      timerRunning: shouldStopTimer ? false : state.timerRunning,
    }));
    
    if (shouldStopTimer) {
      setTimeout(() => {
        alert(`🎉 恭喜！您已成功复原魔方！用时: ${formatTime(get().timer)}`);
      }, 100);
    }
  },

  autoSolve: async () => {
    const { isAutoSolving, pieces } = get();

    if (isAutoSolving) return;
    
    const solution = generateSolution(pieces);
    
    if (solution.length === 0) {
      alert('魔方已经是复原状态！');
      return;
    }

    set({ isAutoSolving: true, isAnimating: true, solutionMoves: solution });

    for (const move of solution) {
      await new Promise(resolve => setTimeout(resolve, 350));
      get().makeMove(move.face, move.direction, move.type, true);
    }

    set({ isAutoSolving: false, isAnimating: false, solutionMoves: [] });
  },

  manualSolveCheck: () => {
    const { pieces } = get();
    const solved = checkSolved(pieces);
    
    if (solved) {
      set({ isSolved: true, timerRunning: false, isManuallyStopped: true });
      alert(`🎉 恭喜！您已成功复原魔方！用时: ${formatTime(get().timer)}`);
    } else {
      alert('❌ 魔方还没有复原，请继续努力！');
    }
  },

  stopTimer: () => {
    const { timerRunning, pieces } = get();
    if (!timerRunning) return;
    
    const solved = checkSolved(pieces);
    set({ timerRunning: false, isManuallyStopped: true });
    
    if (solved) {
      alert(`⏱️ 计时器已停止！用时: ${formatTime(get().timer)}\n✅ 魔方已复原！`);
    } else {
      alert(`⏱️ 计时器已停止！用时: ${formatTime(get().timer)}\n⚠️  注意：魔方尚未完全复原`);
    }
  },

  reset: () => {
    set({
      pieces: createInitialPieces(),
      moveHistory: [],
      isSolved: true,
      timer: 0,
      timerRunning: false,
      isShuffled: false,
      solutionMoves: [],
      isAutoSolving: false,
      isManuallyStopped: false,
    });
  },

  setStyle: (style: StyleType) => set({ style }),
  setShowEdges: (show: boolean) => set({ showEdges: show }),
  setAutoRotate: (auto: boolean) => set({ autoRotate: auto }),
  setTimer: (timer: number) => set({ timer }),
  setTimerRunning: (running: boolean) => set({ timerRunning: running }),
  setIsAnimating: (animating: boolean) => set({ isAnimating: animating }),

  saveState: () => {
    const { pieces, moveHistory, timer, style, isShuffled } = get();
    const state = {
      pieces,
      moveHistory,
      timer,
      style,
      isShuffled,
      savedAt: new Date().toISOString(),
    };
    return JSON.stringify(state, null, 2);
  },

  loadState: (json: string) => {
    try {
      const state = JSON.parse(json);
      const solved = checkSolved(state.pieces);
      set({
        pieces: state.pieces,
        moveHistory: state.moveHistory || [],
        timer: state.timer || 0,
        style: state.style || 'standard',
        isShuffled: state.isShuffled || false,
        isSolved: solved,
        timerRunning: false,
      });
      alert('✅ 状态加载成功！');
    } catch (e) {
      console.error('Failed to load state:', e);
      alert('❌ 加载失败，请确保文件格式正确');
    }
  },
}));

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}
