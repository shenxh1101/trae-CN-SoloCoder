import { Music, Trophy } from 'lucide-react';
import { Song } from '../types/game';
import { getHighScoreForSong } from '../utils/storage';
import { useState, useEffect } from 'react';

interface SongCardProps {
  song: Song;
  onSelect: (song: Song) => void;
}

export function SongCard({ song, onSelect }: SongCardProps) {
  const [highScore, setHighScore] = useState<number | null>(null);

  useEffect(() => {
    const score = getHighScoreForSong(song.id);
    setHighScore(score?.score || null);
  }, [song.id]);

  return (
    <div
      onClick={() => onSelect(song)}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 cursor-pointer group hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20"
    >
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-pink-500 flex items-center justify-center">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{song.name}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
              <span>{song.bpm} BPM</span>
              <span>{Math.floor(song.duration / 1000)}s</span>
              <span>{song.notes.length} notes</span>
            </div>
          </div>
        </div>
        {highScore !== null && (
          <div className="mt-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">
              最高分: {highScore}
            </span>
          </div>
        )}
        {song.isCustom && (
          <div className="mt-2">
            <span className="px-2 py-1 text-xs bg-purple-500/30 text-purple-300 rounded">
              自定义
            </span>
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}
