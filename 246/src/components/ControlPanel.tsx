import { CircleDot, Cloud, CloudDrizzle, Layers, Navigation, RotateCw, Bird, Sparkles } from 'lucide-react';
import { useCloudStore } from '@/store/useCloudStore';
import type { CloudPreset } from '@/types';

const CLOUD_PRESETS: { value: CloudPreset; label: string; icon: React.ReactNode }[] = [
  { value: 'cumulus', label: '积云', icon: <Cloud size={16} /> },
  { value: 'cirrus', label: '卷云', icon: <CloudDrizzle size={16} /> },
  { value: 'stratus', label: '层云', icon: <Layers size={16} /> },
];

export default function ControlPanel() {
  const {
    poem, setPoem,
    cloudPreset, setCloudPreset,
    cameraMode, setCameraMode,
    showBirds, setShowBirds,
    showButterflies, setShowButterflies,
    analysis,
  } = useCloudStore();

  const hasBirdKeyword = analysis.keywords.some(k => k.particleType === 'bird');
  const hasButterflyKeyword = analysis.keywords.some(k => k.particleType === 'butterfly');

  return (
    <div className="absolute top-4 left-4 z-10 w-72 flex flex-col gap-3">
      <div className="glass-panel p-4 flex flex-col gap-4">
        <div>
          <label className="text-xs text-white/60 mb-1.5 block font-serif tracking-wider">诗句输入</label>
          <textarea
            value={poem}
            onChange={(e) => setPoem(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/90 text-sm font-serif resize-none focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 placeholder-white/30 transition-all"
            rows={2}
            placeholder="输入一句古诗，如：落霞与孤鹜齐飞..."
          />
          <p className="text-[10px] text-white/40 mt-1 font-serif">
            提示：输入诗句后，云朵颜色和粒子会根据关键词自动变化
          </p>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-1.5 block font-serif tracking-wider">云型预设</label>
          <div className="flex gap-2">
            {CLOUD_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setCloudPreset(p.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all ${
                  cloudPreset === p.value
                    ? 'bg-gold/20 border border-gold/40 text-gold'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                {p.icon}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-1.5 block font-serif tracking-wider">相机模式</label>
          <div className="flex gap-2">
            <button
              onClick={() => setCameraMode('orbit')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all ${
                cameraMode === 'orbit'
                  ? 'bg-gold/20 border border-gold/40 text-gold'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              <RotateCw size={14} />
              自动环绕
            </button>
            <button
              onClick={() => setCameraMode('free')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all ${
                cameraMode === 'free'
                  ? 'bg-gold/20 border border-gold/40 text-gold'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              <Navigation size={14} />
              WASD漫游
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-1.5 block font-serif tracking-wider">
            氛围粒子
            <span className="ml-1 text-white/30">(由诗句关键词驱动)</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBirds(!showBirds)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all relative ${
                showBirds && hasBirdKeyword
                  ? 'bg-gold/20 border border-gold/40 text-gold'
                  : showBirds
                  ? 'bg-white/10 border border-white/20 text-white/70'
                  : 'bg-white/5 border border-white/10 text-white/40'
              }`}
            >
              <Bird size={14} />
              飞鸟
              {hasBirdKeyword && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-gold rounded-full animate-pulse" title="诗句检测到飞鸟关键词" />
              )}
            </button>
            <button
              onClick={() => setShowButterflies(!showButterflies)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all relative ${
                showButterflies && hasButterflyKeyword
                  ? 'bg-gold/20 border border-gold/40 text-gold'
                  : showButterflies
                  ? 'bg-white/10 border border-white/20 text-white/70'
                  : 'bg-white/5 border border-white/10 text-white/40'
              }`}
            >
              <CircleDot size={14} />
              蝴蝶
              {hasButterflyKeyword && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-400 rounded-full animate-pulse" title="诗句检测到蝴蝶关键词" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
            <Sparkles size={10} />
            {hasBirdKeyword || hasButterflyKeyword
              ? `已检测: ${hasBirdKeyword ? '飞鸟' : ''}${hasBirdKeyword && hasButterflyKeyword ? '、' : ''}${hasButterflyKeyword ? '蝴蝶' : ''}`
              : '输入含"孤鹜"、"飞鸟"、"蝴蝶"等关键词的诗句'}
          </p>
        </div>
      </div>

      {cameraMode === 'free' && (
        <div className="glass-panel px-3 py-2 text-[10px] text-white/40 text-center font-mono tracking-wider">
          WASD 移动 · Q/E 升降 · 鼠标拖拽旋转
        </div>
      )}
      {cameraMode === 'orbit' && (
        <div className="glass-panel px-3 py-2 text-[10px] text-white/40 text-center font-mono tracking-wider">
          自动环绕中 · 滚轮缩放
        </div>
      )}
    </div>
  );
}
