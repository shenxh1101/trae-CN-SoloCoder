import { Droplets } from 'lucide-react';

interface StatsDisplayProps {
  bubbleCount: number;
}

export default function StatsDisplay({ bubbleCount }: StatsDisplayProps) {
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-black/50 backdrop-blur-xl rounded-xl border border-white/20 px-4 py-3 flex items-center gap-3">
        <Droplets size={20} className="text-cyan-400" />
        <div>
          <p className="text-xs text-white/60">当前气泡数量</p>
          <p className="text-xl font-bold text-white">{bubbleCount}</p>
        </div>
      </div>
    </div>
  );
}
