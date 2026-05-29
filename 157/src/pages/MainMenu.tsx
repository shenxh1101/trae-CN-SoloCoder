import { useEffect } from 'react';
import { Plus, Music2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { SongCard } from '../components/SongCard';
import { Song } from '../types/game';
import { useNavigate } from 'react-router-dom';

export function MainMenu() {
  const { songs, loadSongs, setSelectedSong } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    navigate(`/play/${song.id}`);
  };

  const handleCustomSong = () => {
    navigate('/custom');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <Music2 className="w-12 h-12 text-cyan-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
              Rhythm Master
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            跟随节奏，舞动指尖
          </p>
          <p className="text-gray-500 text-sm mt-2">
            使用方向键或 WASD 进行游戏
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={handleCustomSong}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30"
          >
            <Plus className="w-5 h-5" />
            创建自定义歌曲
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {songs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onSelect={handleSelectSong}
            />
          ))}
        </div>

        {songs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无歌曲</p>
          </div>
        )}

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>提示：Perfect ±50ms | Good ±120ms</p>
        </div>
      </div>
    </div>
  );
}
