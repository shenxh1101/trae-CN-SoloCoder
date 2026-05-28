import { useState } from 'react';
import {
  Camera,
  Palette,
  Droplets,
  Sparkles,
  Music,
  Music2,
  Link,
  RotateCcw,
  Camera as CameraIcon,
  Settings,
  X,
} from 'lucide-react';
import { useBubbleStore } from '../../store/useBubbleStore';
import { COLOR_MODES, BACKGROUND_COLORS, BUBBLE_DEFAULTS } from '../../utils/constants';
import Slider from '../UI/Slider';
import Button from '../UI/Button';

interface ControlPanelProps {
  onScreenshot: () => void;
}

export default function ControlPanel({ onScreenshot }: ControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    bubbleCount,
    minSize,
    maxSize,
    floatSpeed,
    backgroundColor,
    colorMode,
    bloomEnabled,
    autoRotate,
    connectionsEnabled,
    musicEnabled,
    setBubbleCount,
    setMinSize,
    setMaxSize,
    setFloatSpeed,
    setBackgroundColor,
    setColorMode,
    toggleBloom,
    toggleAutoRotate,
    toggleConnections,
    toggleMusic,
    audioManager,
  } = useBubbleStore();

  const handleMusicToggle = () => {
    audioManager.init();
    toggleMusic();
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-black/50 backdrop-blur-md
                   border border-white/20 text-white hover:bg-black/70 transition-all
                   hover:scale-110"
      >
        <Settings size={24} />
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80 max-h-[90vh] overflow-y-auto">
      <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-5">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles size={20} className="text-purple-400" />
            控制面板
          </h2>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Droplets size={16} className="text-cyan-400" />
              气泡参数
            </h3>
            <Slider
              label="气泡数量"
              value={bubbleCount}
              min={50}
              max={500}
              step={10}
              onChange={setBubbleCount}
              unit=" 个"
            />
            <Slider
              label="最小尺寸"
              value={minSize}
              min={0.2}
              max={BUBBLE_DEFAULTS.MAX_SIZE}
              step={0.1}
              onChange={setMinSize}
            />
            <Slider
              label="最大尺寸"
              value={maxSize}
              min={minSize}
              max={5}
              step={0.1}
              onChange={setMaxSize}
            />
            <Slider
              label="漂浮速度"
              value={floatSpeed}
              min={0.1}
              max={2}
              step={0.1}
              onChange={setFloatSpeed}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Palette size={16} className="text-pink-400" />
              颜色模式
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="toggle"
                active={colorMode === COLOR_MODES.RANDOM}
                onClick={() => setColorMode(COLOR_MODES.RANDOM)}
              >
                彩色
              </Button>
              <Button
                variant="toggle"
                active={colorMode === COLOR_MODES.PINK}
                onClick={() => setColorMode(COLOR_MODES.PINK)}
              >
                粉色
              </Button>
              <Button
                variant="toggle"
                active={colorMode === COLOR_MODES.BLUE}
                onClick={() => setColorMode(COLOR_MODES.BLUE)}
              >
                蓝色
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Palette size={16} className="text-sky-400" />
              背景颜色
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="toggle"
                active={backgroundColor === BACKGROUND_COLORS.SKY}
                onClick={() => setBackgroundColor(BACKGROUND_COLORS.SKY)}
              >
                天空
              </Button>
              <Button
                variant="toggle"
                active={backgroundColor === BACKGROUND_COLORS.OCEAN}
                onClick={() => setBackgroundColor(BACKGROUND_COLORS.OCEAN)}
              >
                深海
              </Button>
              <Button
                variant="toggle"
                active={backgroundColor === BACKGROUND_COLORS.BLACK}
                onClick={() => setBackgroundColor(BACKGROUND_COLORS.BLACK)}
              >
                黑暗
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Camera size={16} className="text-green-400" />
              视觉效果
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="toggle"
                active={bloomEnabled}
                onClick={toggleBloom}
              >
                <Sparkles size={14} />
                光晕
              </Button>
              <Button
                variant="toggle"
                active={autoRotate}
                onClick={toggleAutoRotate}
              >
                <RotateCcw size={14} />
                旋转
              </Button>
              <Button
                variant="toggle"
                active={connectionsEnabled}
                onClick={toggleConnections}
              >
                <Link size={14} />
                连线
              </Button>
              <Button
                variant="toggle"
                active={musicEnabled}
                onClick={handleMusicToggle}
              >
                {musicEnabled ? <Music size={14} /> : <Music2 size={14} />}
                音乐
              </Button>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <Button
              variant="primary"
              onClick={onScreenshot}
              className="w-full py-3 bg-gradient-to-r from-purple-500/80 to-pink-500/80
                         hover:from-purple-500 hover:to-pink-500 border-0"
            >
              <CameraIcon size={16} />
              保存截图 (PNG)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
