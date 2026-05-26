import { useRef } from 'react';
import { useStarStore, StarConfig } from '@/store/useStarStore';
import {
  ChevronRight,
  ChevronLeft,
  Download,
  Upload,
  Camera,
  RotateCcw,
  Sparkles,
  Cloud,
  Zap,
  Palette,
  RefreshCw,
} from 'lucide-react';

interface ControlPanelProps {
  onScreenshot: () => void;
}

export default function ControlPanel({ onScreenshot }: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    particleCount,
    particleSize,
    autoRotate,
    nebulaEnabled,
    nebulaColor,
    backgroundType,
    cloudEnabled,
    meteorEnabled,
    twinkleSpeed,
    isPanelOpen,
    setParticleCount,
    setParticleSize,
    setAutoRotate,
    setNebulaEnabled,
    setNebulaColor,
    setBackgroundType,
    setCloudEnabled,
    setMeteorEnabled,
    setTwinkleSpeed,
    setIsPanelOpen,
    getConfig,
    applyConfig,
    resetConfig,
  } = useStarStore();

  const handleSaveConfig = () => {
    const config = getConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'starfield-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string) as StarConfig;
        applyConfig(config);
      } catch (err) {
        console.error('Failed to load config:', err);
        alert('配置文件格式错误');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full z-50 transition-transform duration-300 ${
        isPanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="w-80 h-full bg-black/60 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white tracking-wider">
            星空控制台
          </h2>
          <button
            onClick={() => setIsPanelOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} />
              粒子设置
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-white/80 text-sm">粒子数量</label>
                <span className="text-cyan-400 text-sm font-mono">
                  {particleCount}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="10000"
                step="500"
                value={particleCount}
                onChange={(e) => setParticleCount(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-white/80 text-sm">粒子大小</label>
                <span className="text-cyan-400 text-sm font-mono">
                  {particleSize.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3"
                step="0.1"
                value={particleSize}
                onChange={(e) => setParticleSize(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-white/80 text-sm">闪烁速度</label>
                <span className="text-cyan-400 text-sm font-mono">
                  {twinkleSpeed.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={twinkleSpeed}
                onChange={(e) => setTwinkleSpeed(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
              <RotateCcw size={14} />
              相机设置
            </h3>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-white/80 text-sm">自动旋转</span>
              <div
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  autoRotate ? 'bg-cyan-500' : 'bg-white/20'
                }`}
                onClick={() => setAutoRotate(!autoRotate)}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    autoRotate ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>
          </div>

          <div className="h-px bg-white/10" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Palette size={14} />
              星云效果
            </h3>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-white/80 text-sm">启用星云</span>
              <div
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  nebulaEnabled ? 'bg-purple-500' : 'bg-white/20'
                }`}
                onClick={() => setNebulaEnabled(!nebulaEnabled)}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    nebulaEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>

            {nebulaEnabled && (
              <div className="flex gap-2">
                <button
                  onClick={() => setNebulaColor('purple')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm transition-all ${
                    nebulaColor === 'purple'
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  紫色
                </button>
                <button
                  onClick={() => setNebulaColor('cyan')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm transition-all ${
                    nebulaColor === 'cyan'
                      ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  青色
                </button>
              </div>
            )}
          </div>

          <div className="h-px bg-white/10" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Cloud size={14} />
              环境效果
            </h3>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-white/80 text-sm">云雾效果</span>
              <div
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  cloudEnabled ? 'bg-blue-500' : 'bg-white/20'
                }`}
                onClick={() => setCloudEnabled(!cloudEnabled)}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    cloudEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-white/80 text-sm">流星效果</span>
              <div
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  meteorEnabled ? 'bg-yellow-500' : 'bg-white/20'
                }`}
                onClick={() => setMeteorEnabled(!meteorEnabled)}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    meteorEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>
          </div>

          <div className="h-px bg-white/10" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Zap size={14} />
              背景设置
            </h3>

            <div className="flex gap-2">
              <button
                onClick={() => setBackgroundType('black')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm transition-all ${
                  backgroundType === 'black'
                    ? 'bg-black/50 text-white border border-white/30'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                纯黑
              </button>
              <button
                onClick={() => setBackgroundType('gradient')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm transition-all ${
                  backgroundType === 'gradient'
                    ? 'bg-blue-900/50 text-blue-300 border border-blue-500'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                深蓝渐变
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Download size={14} />
              配置管理
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSaveConfig}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-all border border-white/10"
              >
                <Download size={18} />
                <span className="text-sm">保存配置</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-all border border-white/10"
              >
                <Upload size={18} />
                <span className="text-sm">加载配置</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleLoadConfig}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onScreenshot}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg text-cyan-300 hover:text-cyan-200 transition-all border border-cyan-500/30"
              >
                <Camera size={18} />
                <span className="text-sm">截图保存</span>
              </button>
              <button
                onClick={resetConfig}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300 hover:text-red-200 transition-all border border-red-500/30"
              >
                <RefreshCw size={18} />
                <span className="text-sm">重置配置</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 p-3 bg-black/60 backdrop-blur-xl rounded-l-lg border border-white/10 text-white/70 hover:text-white hover:bg-black/80 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
      )}
    </div>
  );
}
