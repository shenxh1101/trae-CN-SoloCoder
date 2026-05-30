import { Activity, Sparkles } from 'lucide-react';
import { useNebulaStore } from '@/store/useNebulaStore';
import { formatNumber } from '@/utils/helpers';

export function StatusBar() {
  const { particleCount, fps } = useNebulaStore();

  const getFpsColor = () => {
    if (fps >= 50) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-[rgba(15,15,35,0.8)] backdrop-blur-md rounded-xl border border-[rgba(139,92,246,0.3)] px-6 py-3 shadow-2xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-purple-400" />
            <div>
              <div className="text-xs text-gray-500">粒子总数</div>
              <div className="text-lg font-bold text-white font-mono">
                {formatNumber(particleCount)}
              </div>
            </div>
          </div>

          <div className="w-px h-10 bg-[rgba(255,255,255,0.1)]" />

          <div className="flex items-center gap-3">
            <Activity size={18} className={getFpsColor()} />
            <div>
              <div className="text-xs text-gray-500">帧率 FPS</div>
              <div className={`text-lg font-bold font-mono ${getFpsColor()}`}>
                {fps}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
