import { X, Fish, Info } from 'lucide-react';
import { useOceanStore } from '@/store/useOceanStore';

export default function FishInfo() {
  const selectedFish = useOceanStore((state) => state.selectedFish);
  const setSelectedFish = useOceanStore((state) => state.setSelectedFish);

  if (!selectedFish) return null;

  const getFishEmoji = (type: string) => {
    switch (type) {
      case 'clownfish':
        return '🐠';
      case 'angelfish':
        return '🐟';
      case 'butterflyfish':
        return '🦋';
      default:
        return '🐡';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setSelectedFish(null)}
      />
      
      <div className="relative glass rounded-2xl p-6 max-w-md w-full animate-float">
        <button
          onClick={() => setSelectedFish(null)}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl"
            style={{ backgroundColor: selectedFish.color + '30' }}
          >
            {getFishEmoji(selectedFish.type)}
          </div>
          
          <div className="flex-1">
            <h2 className="font-display text-2xl text-white glow-text mb-1">
              {selectedFish.name}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Fish size={14} />
              <span>类型: {selectedFish.type}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-ocean-shallow">
            <Info size={16} />
            <span className="font-medium">简介</span>
          </div>
          
          <p className="text-gray-300 text-sm leading-relaxed">
            {selectedFish.description}
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl mb-1">📏</div>
              <div className="text-xs text-gray-400">体型</div>
              <div className="text-white font-medium">{selectedFish.size.toFixed(1)}m</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl mb-1">💨</div>
              <div className="text-xs text-gray-400">游速</div>
              <div className="text-white font-medium">{selectedFish.speed.toFixed(1)}x</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div
                className="w-8 h-8 rounded-full mx-auto mb-1 border-2 border-white/20"
                style={{ backgroundColor: selectedFish.color }}
              />
              <div className="text-xs text-gray-400">体色</div>
              <div className="text-white font-medium text-xs">主色调</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setSelectedFish(null)}
          className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-ocean-shallow to-ocean-light text-white font-medium hover:opacity-90 transition-opacity"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
