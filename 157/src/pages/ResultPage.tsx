import { Home, RotateCcw, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

const gradeColors: Record<string, string> = {
  S: 'from-yellow-400 to-amber-500',
  A: 'from-cyan-400 to-blue-500',
  B: 'from-green-400 to-emerald-500',
  C: 'from-orange-400 to-amber-500',
  D: 'from-red-400 to-rose-500',
  F: 'from-gray-500 to-gray-600',
};

export function ResultPage() {
  const navigate = useNavigate();
  const { gameResult, selectedSong } = useGameStore();

  if (!gameResult || !selectedSong) {
    navigate('/');
    return null;
  }

  const handleRetry = () => {
    navigate(`/play/${selectedSong.id}`);
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">{selectedSong.name}</h2>
            <p className="text-gray-400">演奏结束</p>
          </div>

          {gameResult.isNewRecord && (
            <div className="flex items-center justify-center gap-2 mb-6 py-3 bg-yellow-500/20 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold">新纪录!</span>
            </div>
          )}

          <div className="flex justify-center mb-8">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br ${gradeColors[gameResult.grade] || gradeColors.F} shadow-2xl`}
            >
              <span className="text-6xl font-bold text-white">{gameResult.grade}</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
              {gameResult.score.toLocaleString()}
            </div>
            <div className="text-gray-400 mt-1">最终得分</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="text-center p-4 bg-gray-700/30 rounded-lg">
              <div className="text-2xl font-bold text-cyan-400">{gameResult.maxCombo}</div>
              <div className="text-sm text-gray-400">最大连击</div>
            </div>
            <div className="text-center p-4 bg-gray-700/30 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{gameResult.accuracy.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">准确率</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="text-center p-3 bg-cyan-500/10 rounded-lg">
              <div className="text-xl font-bold text-cyan-400">{gameResult.perfectCount}</div>
              <div className="text-xs text-gray-400">Perfect</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-xl font-bold text-green-400">{gameResult.goodCount}</div>
              <div className="text-xs text-gray-400">Good</div>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <div className="text-xl font-bold text-red-400">{gameResult.missCount}</div>
              <div className="text-xs text-gray-400">Miss</div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleHome}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
            >
              <Home className="w-5 h-5" />
              返回菜单
            </button>
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white rounded-lg font-medium transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              再来一次
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
