import { Zap } from 'lucide-react';

interface BeamCountBadgeProps {
  count: number;
}

export function BeamCountBadge({ count }: BeamCountBadgeProps) {
  return (
    <div className="absolute top-4 left-4 z-20">
      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
        <Zap size={18} className="text-cyan-400" />
        <span className="text-sm text-gray-300">光柱数量</span>
        <span className="text-lg font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
          {count.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
