import type { LyricLine } from '../services/api';

const TIME_PATTERN = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

export function parseLyric(lrc: string): LyricLine[] {
  const lines = lrc.split('\n');
  const lyrics: LyricLine[] = [];

  for (const line of lines) {
    const matches = [...line.matchAll(TIME_PATTERN)];
    if (matches.length === 0) continue;

    const text = line.replace(TIME_PATTERN, '').trim();
    if (!text) continue;

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const time = minutes * 60 * 1000 + seconds * 1000 + milliseconds;

      lyrics.push({ time, text });
    }
  }

  return lyrics.sort((a, b) => a.time - b.time);
}

export function findCurrentLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  let index = -1;

  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      index = i;
    } else {
      break;
    }
  }

  return index;
}
