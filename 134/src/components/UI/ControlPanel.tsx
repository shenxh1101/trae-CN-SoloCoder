import { useState } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Waves,
  Volume2,
  VolumeX,
  RotateCw,
  Camera,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Droplets,
} from 'lucide-react';
import { useOceanStore } from '@/store/useOceanStore';
import { BackgroundType } from '@/types';

export default function ControlPanel() {
  const [isOpen, setIsOpen] = useState(true);
  
  const backgroundType = useOceanStore((state) => state.backgroundType);
  const sunRaysEnabled = useOceanStore((state) => state.sunRaysEnabled);
  const audioEnabled = useOceanStore((state) => state.audioEnabled);
  const bubbleCount = useOceanStore((state) => state.bubbleCount);
  const bubbleDensity = useOceanStore((state) => state.bubbleDensity);
  const autoRotate = useOceanStore((state) => state.autoRotate);
  const autoRotateSpeed = useOceanStore((state) => state.autoRotateSpeed);
  const planktonEnabled = useOceanStore((state) => state.planktonEnabled);
  
  const setBackgroundType = useOceanStore((state) => state.setBackgroundType);
  const toggleSunRays = useOceanStore((state) => state.toggleSunRays);
  const toggleAudio = useOceanStore((state) => state.toggleAudio);
  const setBubbleCount = useOceanStore((state) => state.setBubbleCount);
  const setBubbleDensity = useOceanStore((state) => state.setBubbleDensity);
  const toggleAutoRotate = useOceanStore((state) => state.toggleAutoRotate);
  const setAutoRotateSpeed = useOceanStore((state) => state.setAutoRotateSpeed);
  const togglePlankton = useOceanStore((state) => state.togglePlankton);
  const takeScreenshot = useOceanStore((state) => state.takeScreenshot);

  const backgrounds: { type: BackgroundType; label: string; color: string }[] = [
    { type: 'deep', label: '深海蓝', color: '#0a1628' },
    { type: 'shallow', label: '浅海绿', color: '#1a5a6e' },
    { type: 'night', label: '夜海黑', color: '#050a12' },
  ];

  return (
    <div
      className={`fixed top-1/2 right-0 -translate-y-1/2 z-50 transition-all duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-64'
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full glass rounded-l-lg p-2 text-ocean-shallow hover:text-white transition-colors"
      >
        {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      <div className="glass w-64 rounded-l-xl p-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-ocean-shallow/20">
          <Settings size={20} className="text-ocean-shallow" />
          <h2 className="font-display text-lg text-white glow-text">控制面板</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <Waves size={16} /> 背景颜色
            </label>
            <div className="flex gap-2">
              {backgrounds.map((bg) => (
                <button
                  key={bg.type}
                  onClick={() => setBackgroundType(bg.type)}
                  className={`flex-1 h-10 rounded-lg border-2 transition-all ${
                    backgroundType === bg.type
                      ? 'border-ocean-shallow scale-105'
                      : 'border-transparent hover:border-ocean-shallow/50'
                  }`}
                  style={{ backgroundColor: bg.color }}
                  title={bg.label}
                />
              ))}
            </div>
          </div>

          <ToggleButton
            icon={<Sun size={16} />}
            label="阳光光柱"
            enabled={sunRaysEnabled}
            onToggle={toggleSunRays}
          />

          <ToggleButton
            icon={<Volume2 size={16} />}
            label="环境音效"
            enabled={audioEnabled}
            onToggle={toggleAudio}
            enabledIcon={<Volume2 size={16} />}
            disabledIcon={<VolumeX size={16} />}
          />

          <ToggleButton
            icon={<RotateCw size={16} />}
            label="自动旋转"
            enabled={autoRotate}
            onToggle={toggleAutoRotate}
          />

          {autoRotate && (
            <div className="ml-6">
              <label className="text-xs text-gray-400 mb-1 block">旋转速度</label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={autoRotateSpeed}
                onChange={(e) => setAutoRotateSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>慢</span>
                <span>{autoRotateSpeed.toFixed(1)}</span>
                <span>快</span>
              </div>
            </div>
          )}

          <ToggleButton
            icon={<Sparkles size={16} />}
            label="浮游生物"
            enabled={planktonEnabled}
            onToggle={togglePlankton}
          />

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <Droplets size={16} /> 气泡数量
            </label>
            <input
              type="range"
              min="20"
              max="300"
              step="10"
              value={bubbleCount}
              onChange={(e) => setBubbleCount(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>少</span>
              <span>{bubbleCount}</span>
              <span>多</span>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <Droplets size={16} /> 气泡密度
            </label>
            <input
              type="range"
              min="0.3"
              max="2"
              step="0.1"
              value={bubbleDensity}
              onChange={(e) => setBubbleDensity(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>稀</span>
              <span>{bubbleDensity.toFixed(1)}x</span>
              <span>密</span>
            </div>
          </div>

          <button
            onClick={takeScreenshot}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-ocean-shallow to-ocean-light text-white font-medium hover:opacity-90 transition-opacity hover:shadow-lg hover:shadow-ocean-shallow/30"
          >
            <Camera size={18} />
            截图保存
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToggleButtonProps {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  onToggle: () => void;
  enabledIcon?: React.ReactNode;
  disabledIcon?: React.ReactNode;
}

function ToggleButton({
  icon,
  label,
  enabled,
  onToggle,
  enabledIcon,
  disabledIcon,
}: ToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
        enabled
          ? 'bg-ocean-shallow/20 border border-ocean-shallow/40'
          : 'bg-white/5 border border-white/10 hover:bg-white/10'
      }`}
    >
      <span className={`flex items-center gap-2 ${enabled ? 'text-ocean-shallow' : 'text-gray-400'}`}>
        {enabled ? (enabledIcon || icon) : (disabledIcon || icon)}
        <span className="text-sm text-gray-300">{label}</span>
      </span>
      <div
        className={`w-10 h-5 rounded-full transition-all relative ${
          enabled ? 'bg-ocean-shallow' : 'bg-gray-600'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
            enabled ? 'left-5' : 'left-0.5'
          }`}
        />
      </div>
    </button>
  );
}
