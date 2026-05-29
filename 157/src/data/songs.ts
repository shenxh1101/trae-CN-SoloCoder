import { Note, Song } from '../types/game';
import { DIRECTIONS } from '../config/gameConfig';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function generateNotes(bpm: number, duration: number, pattern: 'random' | 'alternate' | 'burst' = 'random'): Note[] {
  const notes: Note[] = [];
  const beatInterval = 60000 / bpm;
  const totalBeats = Math.floor(duration / beatInterval);
  
  for (let i = 4; i < totalBeats - 2; i++) {
    const time = i * beatInterval;
    
    if (pattern === 'random') {
      if (Math.random() > 0.3) {
        const direction = DIRECTIONS[Math.floor(Math.random() * 4)];
        notes.push({
          id: generateId(),
          direction,
          time,
        });
      }
    } else if (pattern === 'alternate') {
      const direction = DIRECTIONS[i % 4];
      notes.push({
        id: generateId(),
        direction,
        time,
      });
    } else if (pattern === 'burst') {
      if (i % 2 === 0) {
        const count = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < count; j++) {
          const direction = DIRECTIONS[Math.floor(Math.random() * 4)];
          notes.push({
            id: generateId(),
            direction,
            time: time + j * (beatInterval / 2),
          });
        }
      }
    }
  }
  
  return notes;
}

export const BUILTIN_SONGS: Song[] = [
  {
    id: 'song-1',
    name: 'Neon Dreams',
    bpm: 120,
    duration: 45000,
    notes: generateNotes(120, 45000, 'alternate'),
  },
  {
    id: 'song-2',
    name: 'Cyber Pulse',
    bpm: 140,
    duration: 50000,
    notes: generateNotes(140, 50000, 'random'),
  },
  {
    id: 'song-3',
    name: 'Digital Storm',
    bpm: 160,
    duration: 55000,
    notes: generateNotes(160, 55000, 'burst'),
  },
  {
    id: 'song-4',
    name: 'Synthwave Rider',
    bpm: 100,
    duration: 40000,
    notes: generateNotes(100, 40000, 'alternate'),
  },
  {
    id: 'song-5',
    name: 'Electric Heartbeat',
    bpm: 130,
    duration: 48000,
    notes: generateNotes(130, 48000, 'random'),
  },
];

export function getSongById(id: string): Song | undefined {
  return BUILTIN_SONGS.find(s => s.id === id);
}
