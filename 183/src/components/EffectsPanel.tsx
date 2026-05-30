import { Sparkles, Camera, Move, Palette, Sun } from 'lucide-react';
import { useNebulaStore } from '@/store/useNebulaStore';
import { BackgroundType } from '@/types/nebula';

export function EffectsPanel() {
  const {
    bloomEnabled,
    lensFlareEnabled,
    trailEnabled,
    backgroundType,
    updateParameter,
  } = useNebulaStore();

  const toggleEffect = (key: 'bloomEnabled' | 'lensFlareEnabled' | 'trailEnabled') => {
    updateParameter(key, !useNebulaStore.getState()[key]);
  };

  const effects = [
    {
      key: 'bloomEnabled' as const,
      label: 'Bloom发光',
      icon: Sparkles,
      value: bloomEnabled,
      description: '粒子发光效果',
    },
    {
      key: 'lensFlareEnabled' as const,
      label: '镜头光晕',
      icon: Sun,
      value: lensFlareEnabled,
      description: 'Lens Flare效果',
    },
    {
      key: 'trailEnabled' as const,
      label: '粒子拖尾',
      icon: Move,
      value: trailEnabled,
      description: '运动轨迹线条',
    },
  ];

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-64">
      <div className="bg-[rgba(15,15,35,0.8)] backdrop-blur-md rounded-xl border border-[rgba(139,92,246,0.3)] p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-4 tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          视觉效果
        </h2>

        <div className="space-y-3">
          {effects.map((effect) => (
            <button
              key={effect.key}
              onClick={() => toggleEffect(effect.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                effect.value
                  ? 'bg-[rgba(139,92,246,0.3)] border border-purple-500/50 shadow-lg shadow-purple-500/20'
                  : 'bg-[rgba(255,255,255,0.05)] border border-transparent hover:bg-[rgba(255,255,255,0.1)]'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  effect.value ? 'bg-purple-600 text-white' : 'bg-[rgba(255,255,255,0.1)] text-gray-400'
                }`}
              >
                <effect.icon size={18} />
              </div>
              <div className="flex-1 text-left">
                <div className={`text-sm font-medium ${effect.value ? 'text-white' : 'text-gray-300'}`}>
                  {effect.label}
                </div>
                <div className="text-xs text-gray-500">{effect.description}</div>
              </div>
              <div
                className={`w-10 h-6 rounded-full transition-all relative ${
                  effect.value ? 'bg-purple-600' : 'bg-[rgba(255,255,255,0.2)]'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    effect.value ? 'left-5' : 'left-1'
                  }`}
                />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2 mb-3">
            <Palette size={16} className="text-gray-400" />
            <span className="text-sm text-gray-300">背景类型</span>
          </div>
          <div className="flex gap-2">
            {(['black', 'stars'] as BackgroundType[]).map((type) => (
              <button
                key={type}
                onClick={() => updateParameter('backgroundType', type)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  backgroundType === type
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-[rgba(255,255,255,0.1)] text-gray-300 hover:bg-[rgba(255,255,255,0.2)]'
                }`}
              >
                {type === 'black' ? (
                  <>
                    <div className="w-3 h-3 rounded-full bg-black border border-gray-600" />
                    纯黑
                  </>
                ) : (
                  <>
                    <Camera size={14} />
                    星图
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
