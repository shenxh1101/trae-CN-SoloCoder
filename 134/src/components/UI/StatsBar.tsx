import { Fish, Droplets, Users } from 'lucide-react';
import { useOceanStore } from '@/store/useOceanStore';

export default function StatsBar() {
  const fishCount = useOceanStore((state) => state.fishCount);
  const bubbleCount = useOceanStore((state) => state.bubbleCount);
  const bubbleDensity = useOceanStore((state) => state.bubbleDensity);

  const totalBubbles = Math.floor(bubbleCount * bubbleDensity);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
      <div className="glass rounded-full px-6 py-3 flex items-center gap-6">
        <h1 className="font-display text-xl text-white glow-text mr-2">
          🌊 海底世界
        </h1>
        
        <div className="h-6 w-px bg-white/20" />
        
        <div className="flex items-center gap-2">
          <Fish size={18} className="text-coral" />
          <span className="text-gray-300 text-sm">鱼群</span>
          <span className="text-white font-bold text-lg">{fishCount}</span>
        </div>
        
        <div className="h-6 w-px bg-white/20" />
        
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-ocean-shallow" />
          <span className="text-gray-300 text-sm">气泡</span>
          <span className="text-white font-bold text-lg">{totalBubbles}</span>
        </div>
        
        <div className="h-6 w-px bg-white/20" />
        
        <div className="flex items-center gap-2">
          <Users size={18} className="text-seagreen" />
          <span className="text-gray-300 text-sm">潜水员</span>
          <span className="text-white font-bold text-lg">1</span>
        </div>
      </div>
    </div>
  );
}
