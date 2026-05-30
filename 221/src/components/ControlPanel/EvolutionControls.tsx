import { Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useCreatureStore } from '../../store/useCreatureStore';

export function EvolutionControls() {
  const { evolve, like, dislike, isEvolving, evolutionBias } = useCreatureStore();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-orange-400" />
        进化控制
      </h3>

      <div className="space-y-3">
        <button
          onClick={evolve}
          disabled={isEvolving}
          className="w-full py-4 px-6 rounded-xl font-bold text-lg
            bg-gradient-to-r from-orange-500 to-pink-500
            hover:from-orange-400 hover:to-pink-400
            disabled:opacity-50 disabled:cursor-not-allowed
            text-white shadow-lg shadow-orange-500/25
            transition-all duration-200 transform
            hover:scale-[1.02] active:scale-[0.98]
            flex items-center justify-center gap-2"
        >
          {isEvolving ? (
            <>
              <span className="animate-spin">⚛️</span>
              进化中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              进 化
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={like}
            className={`py-3 px-4 rounded-xl font-semibold
              flex items-center justify-center gap-2
              transition-all duration-200 transform
              hover:scale-[1.02] active:scale-[0.98]
              ${
                evolutionBias === 'conservative'
                  ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-300'
                  : 'bg-white/5 border border-white/10 text-white/80 hover:bg-emerald-500/20 hover:border-emerald-500/50'
              }`}
          >
            <ThumbsUp className="w-5 h-5" />
            点赞
          </button>

          <button
            onClick={dislike}
            className={`py-3 px-4 rounded-xl font-semibold
              flex items-center justify-center gap-2
              transition-all duration-200 transform
              hover:scale-[1.02] active:scale-[0.98]
              ${
                evolutionBias === 'radical'
                  ? 'bg-rose-500/30 border-2 border-rose-400 text-rose-300'
                  : 'bg-white/5 border border-white/10 text-white/80 hover:bg-rose-500/20 hover:border-rose-500/50'
              }`}
          >
            <ThumbsDown className="w-5 h-5" />
            点踩
          </button>
        </div>

        <div className="text-xs text-white/40 text-center">
          <span className="text-emerald-400">💚 点赞</span> → 下一代微调 &nbsp;|&nbsp;
          <span className="text-rose-400">❤️ 点踩</span> → 下一代剧变
        </div>
      </div>
    </div>
  );
}
