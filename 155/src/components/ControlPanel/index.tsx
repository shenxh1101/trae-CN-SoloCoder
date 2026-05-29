import { useState } from 'react';
import { Settings, Sparkles, RotateCcw, CloudFog, Layers, ChevronRight, ChevronLeft } from 'lucide-react';
import { SliderItem } from './SliderItem';
import { ToggleItem } from './ToggleItem';
import { ColorModeSwitch } from './ColorModeSwitch';
import { BackgroundSwitch } from './BackgroundSwitch';
import { ActionButtons } from './ActionButtons';
import { useConfig, useSceneActions } from '../../store/useSceneStore';

export function ControlPanel() {
  const config = useConfig();
  const actions = useSceneActions();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`fixed top-0 right-0 h-full z-30 transition-all duration-300 ${isCollapsed ? 'translate-x-[calc(100%-48px)]' : 'translate-x-0'}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-gray-900/90 backdrop-blur-md p-2 rounded-l-lg border border-r-0 border-gray-700 hover:bg-gray-800/90 transition-colors"
      >
        {isCollapsed ? <ChevronLeft size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
      </button>

      <div className="w-80 h-full bg-gray-900/90 backdrop-blur-xl border-l border-gray-700/50 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700/50">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">光柱森林</h1>
              <p className="text-xs text-gray-500">3D Interactive Light Forest</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Settings size={14} />
              光柱参数
            </h2>
            <SliderItem
              label="光柱数量"
              value={config.beamCount}
              min={100}
              max={2500}
              step={50}
              unit="根"
              onChange={actions.setBeamCount}
            />
            <SliderItem
              label="最小高度"
              value={config.beamMinHeight}
              min={1}
              max={15}
              step={0.5}
              unit="m"
              onChange={(v) => actions.setHeightRange(v, config.beamMaxHeight)}
            />
            <SliderItem
              label="最大高度"
              value={config.beamMaxHeight}
              min={5}
              max={25}
              step={0.5}
              unit="m"
              onChange={(v) => actions.setHeightRange(config.beamMinHeight, v)}
            />
            <SliderItem
              label="光柱粗细"
              value={config.beamRadius}
              min={0.05}
              max={0.5}
              step={0.01}
              unit="m"
              onChange={actions.setBeamRadius}
            />
            <SliderItem
              label="脉冲速度"
              value={config.pulseSpeed}
              min={0.1}
              max={5}
              step={0.1}
              unit="x"
              onChange={actions.setPulseSpeed}
            />
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers size={14} />
              视觉效果
            </h2>
            <ColorModeSwitch value={config.colorMode} onChange={actions.setColorMode} />
            <BackgroundSwitch value={config.backgroundColor} onChange={actions.setBackgroundColor} />
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles size={14} />
              特效开关
            </h2>
            <ToggleItem
              label="镜面反射"
              icon={Layers}
              checked={config.enableMirror}
              onChange={actions.toggleMirror}
            />
            <ToggleItem
              label="雾化效果"
              icon={CloudFog}
              checked={config.enableFog}
              onChange={actions.toggleFog}
            />
            <ToggleItem
              label="粒子效果"
              icon={Sparkles}
              checked={config.enableParticles}
              onChange={actions.toggleParticles}
            />
            <ToggleItem
              label="自动环绕"
              icon={RotateCcw}
              checked={config.autoRotate}
              onChange={actions.toggleAutoRotate}
            />
          </div>

          <ActionButtons
            onScreenshot={actions.triggerScreenshot}
            onExport={actions.exportConfig}
            onRegenerate={actions.regenerateBeams}
          />

          <div className="mt-6 pt-4 border-t border-gray-700/50 text-center">
            <p className="text-xs text-gray-600">
              拖拽旋转 · 滚轮缩放 · 右键平移
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
