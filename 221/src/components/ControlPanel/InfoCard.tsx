import { Dna, Award, Clock } from 'lucide-react';
import { useCreatureStore } from '../../store/useCreatureStore';

export function InfoCard() {
  const { currentCreature, evolutionBias } = useCreatureStore();

  const getBiasLabel = () => {
    switch (evolutionBias) {
      case 'conservative':
        return { text: '保守进化', color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
      case 'radical':
        return { text: '激进进化', color: 'text-rose-400', bg: 'bg-rose-400/10' };
      default:
        return { text: '中立进化', color: 'text-cyan-400', bg: 'bg-cyan-400/10' };
    }
  };

  const bias = getBiasLabel();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
        <Clock className="w-5 h-5 text-cyan-400" />
        生物信息
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs text-white/50 mb-1">进化代数</div>
          <div className="text-2xl font-bold text-cyan-400">
            #{currentCreature?.generation || 0}
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs text-white/50 mb-1">适应度分数</div>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-amber-400">
              {currentCreature?.fitness || 0}
            </span>
            <span className="text-sm text-white/40 mb-1">/100</span>
          </div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${currentCreature?.fitness || 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className={`rounded-lg p-3 border ${bias.bg} border-white/10`}>
        <div className="text-xs text-white/50 mb-1">进化偏向</div>
        <div className={`font-semibold ${bias.color}`}>{bias.text}</div>
      </div>

      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Dna className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-white/50">基因序列</span>
        </div>
        <div
          className="font-mono text-xs text-cyan-300/80 break-all bg-black/30 rounded p-2 border border-white/5"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {currentCreature?.geneSequence || '—'}
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-white/50">部位数量</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {currentCreature?.parts.map((part, idx) => (
            <span
              key={idx}
              className={`text-xs px-2 py-0.5 rounded-full ${
                part.locked
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/10 text-white/70 border border-white/10'
              }`}
            >
              {part.type.replace('_', ' ')}
              {part.locked && ' 🔒'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
