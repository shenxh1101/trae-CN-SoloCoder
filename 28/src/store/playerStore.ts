import { create } from 'zustand';
import type { Song, LyricLine, User } from '../services/api';

export type LoopMode = 'single' | 'list' | 'shuffle';
export type VisualizerMode = 'bars' | 'wave';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  mute: boolean;
  loopMode: LoopMode;
  playQueue: Song[];
  currentIndex: number;
  lyrics: LyricLine[];
  currentLyricIndex: number;
  visualizerMode: VisualizerMode;
  showLyrics: boolean;
  showVisualizer: boolean;
  user: User | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
}

interface PlayerActions {
  setCurrentSong: (song: Song, autoPlay?: boolean) => void;
  togglePlay: () => void;
  setPlayState: (playing: boolean) => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  nextSong: () => void;
  prevSong: () => void;
  setLoopMode: (mode: LoopMode) => void;
  addToQueue: (song: Song) => void;
  addListToQueue: (songs: Song[]) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  setLyrics: (lyrics: LyricLine[]) => void;
  setCurrentLyricIndex: (index: number) => void;
  toggleVisualizerMode: () => void;
  toggleShowLyrics: () => void;
  toggleShowVisualizer: () => void;
  setUser: (user: User | null) => void;
  updateProgress: (current: number, total: number) => void;
  setAudioContext: (ctx: AudioContext | null, analyser: AnalyserNode | null) => void;
}

export type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  mute: false,
  loopMode: 'list',
  playQueue: [],
  currentIndex: 0,
  lyrics: [],
  currentLyricIndex: 0,
  visualizerMode: 'bars',
  showLyrics: false,
  showVisualizer: false,
  user: null,
  audioContext: null,
  analyser: null,

  setCurrentSong: (song, autoPlay = false) => {
    const { playQueue } = get();
    const existingIndex = playQueue.findIndex(s => s.id === song.id);
    if (existingIndex === -1) {
      set(state => ({
        playQueue: [...state.playQueue, song],
        currentIndex: state.playQueue.length,
        currentSong: song,
        isPlaying: autoPlay,
        currentTime: 0,
        duration: song.duration,
        lyrics: [],
        currentLyricIndex: 0,
      }));
    } else {
      set({
        currentIndex: existingIndex,
        currentSong: song,
        isPlaying: autoPlay,
        currentTime: 0,
        duration: song.duration,
        lyrics: [],
        currentLyricIndex: 0,
      });
    }
  },

  togglePlay: () => set(state => ({ isPlaying: !state.isPlaying })),

  setPlayState: (playing) => set({ isPlaying: playing }),

  seek: (time) => set({ currentTime: time }),

  setVolume: (vol) => set({ volume: Math.max(0, Math.min(1, vol)), mute: false }),

  toggleMute: () => set(state => ({ mute: !state.mute })),

  nextSong: () => {
    const { loopMode, playQueue, currentIndex } = get();
    if (playQueue.length === 0) return;

    let nextIndex: number;
    switch (loopMode) {
      case 'single':
        nextIndex = currentIndex;
        break;
      case 'list':
        nextIndex = (currentIndex + 1) % playQueue.length;
        break;
      case 'shuffle':
        if (playQueue.length === 1) {
          nextIndex = 0;
        } else {
          do {
            nextIndex = Math.floor(Math.random() * playQueue.length);
          } while (nextIndex === currentIndex);
        }
        break;
      default:
        nextIndex = currentIndex;
    }

    set({
      currentIndex: nextIndex,
      currentSong: playQueue[nextIndex],
      currentTime: 0,
      duration: playQueue[nextIndex].duration,
      lyrics: [],
      currentLyricIndex: 0,
    });
  },

  prevSong: () => {
    const { loopMode, playQueue, currentIndex } = get();
    if (playQueue.length === 0) return;

    let prevIndex: number;
    switch (loopMode) {
      case 'single':
        prevIndex = currentIndex;
        break;
      case 'list':
        prevIndex = (currentIndex - 1 + playQueue.length) % playQueue.length;
        break;
      case 'shuffle':
        if (playQueue.length === 1) {
          prevIndex = 0;
        } else {
          do {
            prevIndex = Math.floor(Math.random() * playQueue.length);
          } while (prevIndex === currentIndex);
        }
        break;
      default:
        prevIndex = currentIndex;
    }

    set({
      currentIndex: prevIndex,
      currentSong: playQueue[prevIndex],
      currentTime: 0,
      duration: playQueue[prevIndex].duration,
      lyrics: [],
      currentLyricIndex: 0,
    });
  },

  setLoopMode: (mode) => set({ loopMode: mode }),

  addToQueue: (song) => set(state => ({
    playQueue: [...state.playQueue, song],
  })),

  addListToQueue: (songs) => set(state => ({
    playQueue: [...state.playQueue, ...songs],
  })),

  removeFromQueue: (index) => set(state => {
    const newQueue = [...state.playQueue];
    newQueue.splice(index, 1);
    
    let newIndex = state.currentIndex;
    if (index < state.currentIndex) {
      newIndex = state.currentIndex - 1;
    } else if (index === state.currentIndex) {
      newIndex = Math.min(state.currentIndex, newQueue.length - 1);
    }

    return {
      playQueue: newQueue,
      currentIndex: newIndex,
      currentSong: newQueue.length > 0 ? newQueue[newIndex] : null,
    };
  }),

  reorderQueue: (fromIndex, toIndex) => set(state => {
    const newQueue = [...state.playQueue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);

    let newIndex = state.currentIndex;
    if (state.currentIndex === fromIndex) {
      newIndex = toIndex;
    } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
      newIndex = state.currentIndex - 1;
    } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
      newIndex = state.currentIndex + 1;
    }

    return {
      playQueue: newQueue,
      currentIndex: newIndex,
    };
  }),

  clearQueue: () => set({
    playQueue: [],
    currentIndex: 0,
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    lyrics: [],
    currentLyricIndex: 0,
  }),

  setLyrics: (lyrics) => set({ lyrics, currentLyricIndex: 0 }),

  setCurrentLyricIndex: (index) => set({ currentLyricIndex: index }),

  toggleVisualizerMode: () => set(state => ({
    visualizerMode: state.visualizerMode === 'bars' ? 'wave' : 'bars',
  })),

  toggleShowLyrics: () => set(state => ({ showLyrics: !state.showLyrics })),

  toggleShowVisualizer: () => set(state => ({ showVisualizer: !state.showVisualizer })),

  setUser: (user) => set({ user }),

  updateProgress: (current, total) => set({
    currentTime: current,
    duration: total,
  }),

  setAudioContext: (ctx, analyser) => set({ audioContext: ctx, analyser }),
}));
