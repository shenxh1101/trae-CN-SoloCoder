import { create } from "zustand";
import { Difficulty, OBJECT_CATEGORIES, COCO_LABEL_MAP, DetectionResult, DIFFICULTY_CONFIG } from "@/lib/constants";
import { MatchRecord, calculateAccuracy, getFastestTime, StoredRecord, generateId, saveRecord } from "@/lib/storage";

export interface Player {
  id: string;
  name: string;
  score: number;
  matchHistory: MatchRecord[];
  fastestTime: number;
  accuracy: number;
}

export type GameStatus = "idle" | "loading" | "playing" | "ended";

interface GameState {
  status: GameStatus;
  currentTarget: string | null;
  score: number;
  combo: number;
  maxCombo: number;
  timeRemaining: number;
  difficulty: Difficulty;
  selectedObjects: string[];
  voiceEnabled: boolean;
  detectionResults: DetectionResult[];
  matchHistory: MatchRecord[];
  targetAppearTime: number;
  players: Player[];
  currentPlayerIndex: number;
  isMultiplayer: boolean;
  lastMatchTime: number;
  showBoundingBoxes: boolean;

  setStatus: (status: GameStatus) => void;
  setDifficulty: (d: Difficulty) => void;
  setSelectedObjects: (objects: string[]) => void;
  toggleObject: (cocoLabel: string) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setShowBoundingBoxes: (show: boolean) => void;
  setDetectionResults: (results: DetectionResult[]) => void;
  startGame: () => void;
  endGame: () => void;
  nextTarget: () => void;
  recordMatch: (matched: boolean) => void;
  tick: () => void;
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  setMultiplayer: (val: boolean) => void;
  nextPlayer: () => boolean;
  resetGame: () => void;
  saveCurrentPlayerRecord: () => void;
}

function pickRandomTarget(selectedObjects: string[], currentTarget: string | null): string | null {
  if (selectedObjects.length === 0) return null;
  const available = selectedObjects.filter((o) => o !== currentTarget);
  const pool = available.length > 0 ? available : selectedObjects;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const useGameStore = create<GameState>((set, get) => ({
  status: "idle",
  currentTarget: null,
  score: 0,
  combo: 0,
  maxCombo: 0,
  timeRemaining: 60,
  difficulty: "normal",
  selectedObjects: OBJECT_CATEGORIES.map((c) => c.cocoLabel),
  voiceEnabled: true,
  detectionResults: [],
  matchHistory: [],
  targetAppearTime: 0,
  players: [],
  currentPlayerIndex: 0,
  isMultiplayer: false,
  lastMatchTime: 0,
  showBoundingBoxes: true,

  setStatus: (status) => set({ status }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setSelectedObjects: (selectedObjects) => set({ selectedObjects }),
  toggleObject: (cocoLabel) =>
    set((state) => {
      const exists = state.selectedObjects.includes(cocoLabel);
      const next = exists
        ? state.selectedObjects.filter((o) => o !== cocoLabel)
        : [...state.selectedObjects, cocoLabel];
      return { selectedObjects: next.length > 0 ? next : state.selectedObjects };
    }),
  setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
  setShowBoundingBoxes: (showBoundingBoxes) => set({ showBoundingBoxes }),
  setDetectionResults: (detectionResults) => set({ detectionResults }),

  startGame: () => {
    const state = get();
    const target = pickRandomTarget(state.selectedObjects, null);
    set({
      status: "playing",
      currentTarget: target,
      score: 0,
      combo: 0,
      maxCombo: 0,
      timeRemaining: 60,
      matchHistory: [],
      targetAppearTime: Date.now(),
      lastMatchTime: 0,
    });
  },

  endGame: () => {
    const state = get();
    let updatedPlayers = state.players;
    if (state.isMultiplayer && state.currentPlayerIndex < state.players.length) {
      updatedPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? {
              ...p,
              score: state.score,
              matchHistory: [...state.matchHistory],
              accuracy: calculateAccuracy(state.matchHistory),
              fastestTime: getFastestTime(state.matchHistory),
            }
          : p
      );
    }
    set({ status: "ended", players: updatedPlayers });
  },

  nextTarget: () => {
    const state = get();
    const target = pickRandomTarget(state.selectedObjects, state.currentTarget);
    set({ currentTarget: target, targetAppearTime: Date.now() });
  },

  recordMatch: (matched) => {
    const state = get();
    const timeTaken = matched ? Date.now() - state.targetAppearTime : 0;
    const record: MatchRecord = {
      target: state.currentTarget || "",
      matched,
      timeTaken,
      timestamp: Date.now(),
    };

    const newCombo = matched ? state.combo + 1 : 0;
    const newMaxCombo = Math.max(state.maxCombo, newCombo);
    const multiplier = DIFFICULTY_CONFIG[state.difficulty].scoreMultiplier;
    const newScore = matched ? state.score + (10 + 10 * (newCombo - 1)) * multiplier : state.score;

    set({
      matchHistory: [...state.matchHistory, record],
      combo: newCombo,
      maxCombo: newMaxCombo,
      score: newScore,
      lastMatchTime: matched ? timeTaken : state.lastMatchTime,
    });
  },

  tick: () =>
    set((state) => {
      const next = state.timeRemaining - 1;
      if (next <= 0) {
        return { timeRemaining: 0 };
      }
      return { timeRemaining: next };
    }),

  addPlayer: (name) =>
    set((state) => ({
      players: [
        ...state.players,
        {
          id: generateId(),
          name,
          score: 0,
          matchHistory: [],
          fastestTime: 0,
          accuracy: 0,
        },
      ],
    })),

  removePlayer: (id) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== id),
    })),

  setMultiplayer: (isMultiplayer) => set({ isMultiplayer }),

  nextPlayer: () => {
    const state = get();
    const nextIndex = state.currentPlayerIndex + 1;
    if (nextIndex >= state.players.length) {
      return false;
    }
    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex
        ? {
            ...p,
            score: state.score,
            matchHistory: [...state.matchHistory],
            accuracy: calculateAccuracy(state.matchHistory),
            fastestTime: getFastestTime(state.matchHistory),
          }
        : p
    );

    set({
      currentPlayerIndex: nextIndex,
      players: updatedPlayers,
      score: 0,
      combo: 0,
      maxCombo: 0,
      timeRemaining: 60,
      matchHistory: [],
      currentTarget: null,
    });
    return true;
  },

  resetGame: () =>
    set({
      status: "idle",
      currentTarget: null,
      score: 0,
      combo: 0,
      maxCombo: 0,
      timeRemaining: 60,
      matchHistory: [],
      targetAppearTime: 0,
      currentPlayerIndex: 0,
      lastMatchTime: 0,
    }),

  saveCurrentPlayerRecord: () => {
    const state = get();
    const accuracy = calculateAccuracy(state.matchHistory);
    const fastestTime = getFastestTime(state.matchHistory);
    const record: StoredRecord = {
      id: generateId(),
      playerName: state.isMultiplayer
        ? state.players[state.currentPlayerIndex]?.name || "未知玩家"
        : "单人玩家",
      score: state.score,
      accuracy,
      fastestTime,
      difficulty: state.difficulty,
      timestamp: Date.now(),
      matchHistory: [...state.matchHistory],
      selectedObjects: [...state.selectedObjects],
    };
    saveRecord(record);

    if (state.isMultiplayer && state.currentPlayerIndex < state.players.length) {
      const updatedPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? { ...p, score: state.score, matchHistory: [...state.matchHistory], accuracy, fastestTime }
          : p
      );
      set({ players: updatedPlayers });
    }
  },
}));
