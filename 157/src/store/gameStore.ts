import { create } from 'zustand';
import { GameResult, Song } from '../types/game';
import { BUILTIN_SONGS } from '../data/songs';
import { getCustomSongs } from '../utils/storage';

interface GameStore {
  songs: Song[];
  selectedSong: Song | null;
  gameResult: GameResult | null;
  isPlaying: boolean;
  loadSongs: () => void;
  setSelectedSong: (song: Song) => void;
  setGameResult: (result: GameResult) => void;
  clearGameResult: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  songs: [],
  selectedSong: null,
  gameResult: null,
  isPlaying: false,
  
  loadSongs: () => {
    const customSongs = getCustomSongs();
    set({ songs: [...BUILTIN_SONGS, ...customSongs] });
  },
  
  setSelectedSong: (song: Song) => set({ selectedSong: song }),
  
  setGameResult: (result: GameResult) => set({ gameResult: result }),
  
  clearGameResult: () => set({ gameResult: null }),
}));
