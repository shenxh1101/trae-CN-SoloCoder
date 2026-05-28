import { useState } from 'react';
import { ColorMode } from '@/lib/ParticleSystem';
import { Settings, Play, Sparkles, Maximize2, Palette, ArrowDown, Zap, RotateCcw, Camera, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  currentParticleCount: number;
  particleCount: number;
  explosionForce: number;
  particleSize: number;
  colorMode: ColorMode;
  gravityEnabled: boolean;
  slowMotionEnabled: boolean;
  autoRotateEnabled: boolean;
  starBackground: boolean;
  onParticleCountChange: (value: number) => void;
  onExplosionForceChange: (value: number) => void;
  onParticleSizeChange: (value: number) => void;
  onColorModeChange: (mode: ColorMode) => void;
  onGravityToggle: (enabled: boolean) => void;
  onSlowMotionToggle: (enabled: boolean) => void;
  onAutoRotateToggle: (enabled: boolean) => void;
  onBackgroundToggle: (enabled: boolean) => void;
}

export default function ControlPanel({
  currentParticleCount,
  particleCount,
  explosionForce,
  particleSize,
  colorMode,
  gravityEnabled,
  slowMotionEnabled,
  autoRotateEnabled,
  starBackground,
  onParticleCountChange,
  onExplosionForceChange,
  onParticleSizeChange,
  onColorModeChange,
  onGravityToggle,
  onSlowMotionToggle,
  onAutoRotateToggle,
  onBackgroundToggle,
}: ControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const colorModes: { value: ColorMode; label: string; color: string }[] = [
    { value: 'random', label: '彩虹色', color: 'linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0)' },
    { value: 'redOrange', label: '红橙色', color: 'linear-gradient(90deg, #ff4500, #ff8c00)' },
    { value: 'blueWhite', label: '蓝白色', color: 'linear-gradient(90deg, #00bfff, #ffffff)' },
  ];

  const ToggleSwitch = ({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative w-14 h-7 rounded-full transition-all duration-300",
        enabled ? "bg-gradient-to-r from-cyan-500 to-blue-500" : "bg-gray-700"
      )}
      aria-label={label}
    >
      <span
        className={cn(
          "absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-lg",
          enabled ? "left-8" : "left-1"
        )}
      />
    </button>
  );

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full z-30 transition-all duration-500 ease-out",
        isCollapsed ? "w-12" : "w-80"
      )}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-gray-900/80 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-all duration-300 shadow-lg border border-gray-700 z-10"
        aria-label={isCollapsed ? "展开面板" : "收起面板"}
      >
        <Maximize2 className={cn("w-4 h-4 transition-transform", isCollapsed ? "" : "rotate-180")} />
      </button>

      <div
        className={cn(
          "h-full bg-gray-900/70 backdrop-blur-xl border-l border-gray-700/50 overflow-hidden transition-all duration-500",
          isCollapsed ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="p-6 h-full overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">星星爆炸</h1>
              <p className="text-xs text-gray-400">Star Explosion</p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
            <div className="flex items-center gap-2 text-purple-300 mb-1">
              <Star className="w-4 h-4" />
              <span className="text-sm font-medium">当前粒子数</span>
            </div>
            <p className="text-3xl font-bold text-white">{currentParticleCount.toLocaleString()}</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                <Settings className="w-4 h-4" />
                粒子数量: <span className="text-cyan-400 font-bold">{particleCount}</span>
              </label>
              <input
                type="range"
                min="1000"
                max="10000"
                step="500"
                value={particleCount}
                onChange={(e) => onParticleCountChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1,000</span>
                <span>10,000</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                <Zap className="w-4 h-4" />
                爆炸力度: <span className="text-orange-400 font-bold">{explosionForce}</span>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={explosionForce}
                onChange={(e) => onExplosionForceChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>弱</span>
                <span>强</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                <Maximize2 className="w-4 h-4" />
                粒子大小: <span className="text-green-400 font-bold">{particleSize}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={particleSize}
                onChange={(e) => onParticleSizeChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>小</span>
                <span>大</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                <Palette className="w-4 h-4" />
                颜色模式
              </label>
              <div className="space-y-2">
                {colorModes.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => onColorModeChange(mode.value)}
                    className={cn(
                      "w-full p-3 rounded-lg flex items-center gap-3 transition-all duration-300",
                      colorMode === mode.value
                        ? "bg-gray-700/80 ring-2 ring-cyan-500"
                        : "bg-gray-800/50 hover:bg-gray-700/50"
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ background: mode.color }}
                    />
                    <span className="text-white text-sm">{mode.label}</span>
                    {colorMode === mode.value && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowDown className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300 text-sm">重力效果</span>
                </div>
                <ToggleSwitch
                  enabled={gravityEnabled}
                  onChange={onGravityToggle}
                  label="重力效果"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-300 text-sm">慢动作播放</span>
                </div>
                <ToggleSwitch
                  enabled={slowMotionEnabled}
                  onChange={onSlowMotionToggle}
                  label="慢动作"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300 text-sm">自动旋转</span>
                </div>
                <ToggleSwitch
                  enabled={autoRotateEnabled}
                  onChange={onAutoRotateToggle}
                  label="自动旋转"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300 text-sm">星空背景</span>
                </div>
                <ToggleSwitch
                  enabled={starBackground}
                  onChange={onBackgroundToggle}
                  label="星空背景"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-800/50 rounded-xl">
            <p className="text-xs text-gray-400 leading-relaxed">
              💡 <span className="text-gray-300">提示:</span> 拖拽鼠标旋转视角，滚轮缩放，调节参数创造不同的爆炸效果！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
