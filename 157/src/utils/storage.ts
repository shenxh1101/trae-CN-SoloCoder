import { HighScore, Song } from '../types/game';
import { STORAGE_KEYS } from '../config/gameConfig';

export function getHighScores(): HighScore[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getHighScoreForSong(songId: string): HighScore | null {
  const scores = getHighScores();
  return scores.find(s => s.songId === songId) || null;
}

export function saveHighScore(score: HighScore): void {
  const scores = getHighScores();
  const existingIndex = scores.findIndex(s => s.songId === score.songId);
  
  if (existingIndex >= 0) {
    if (score.score > scores[existingIndex].score) {
      scores[existingIndex] = score;
    }
  } else {
    scores.push(score);
  }
  
  localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(scores));
}

export function getCustomSongs(): Song[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_SONGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveCustomSong(song: Song): void {
  const songs = getCustomSongs();
  const existingIndex = songs.findIndex(s => s.id === song.id);
  
  if (existingIndex >= 0) {
    songs[existingIndex] = song;
  } else {
    songs.push(song);
  }
  
  const serialized = JSON.stringify(songs);
  if (serialized.length > 4 * 1024 * 1024) {
    throw new DOMException('存储数据过大', 'QuotaExceededError');
  }
  localStorage.setItem(STORAGE_KEYS.CUSTOM_SONGS, serialized);
}

export function deleteCustomSong(songId: string): void {
  const songs = getCustomSongs();
  const filtered = songs.filter(s => s.id !== songId);
  localStorage.setItem(STORAGE_KEYS.CUSTOM_SONGS, JSON.stringify(filtered));
}
