import { Sparkles } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore';

export default function ParticleStats() {
  const particleCount = useConfigStore((state) => state.particleCount);

  return (
    <div className="absolute bottom-4 left-4 px-4 py-3 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-400">粒子总数</p>
          <p className="text-2xl font-bold text-white">
            {particleCount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
