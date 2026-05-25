import React from 'react';
import { Sun, Lightbulb, Lamp, Sliders } from 'lucide-react';
import { useConfigStore, useHistoryStore } from '@/store/useConfigStore';
import { LIGHTING_PRESETS } from '@/types';
import type { LightingPreset } from '@/types';
import { cn } from '@/lib/utils';

interface LightingPanelProps {
  className?: string;
}

const presetIcons: Record<LightingPreset, React.ReactNode> = {
  indoor: <Lightbulb className="w-5 h-5" />,
  outdoor: <Sun className="w-5 h-5" />,
  stage: <Lamp className="w-5 h-5" />
};

export const LightingPanel = ({ className }: LightingPanelProps) => {
  const lighting = useConfigStore((state) => state.config.lighting);
  const setLightingPreset = useConfigStore((state) => state.setLightingPreset);
  const updateLighting = useConfigStore((state) => state.updateLighting);
  const { pushHistory } = useHistoryStore();

  const handlePresetChange = (preset: LightingPreset) => {
    pushHistory(useConfigStore.getState().config);
    setLightingPreset(preset);
  };

  const handleManualChange = (updates: Partial<typeof lighting>) => {
    pushHistory(useConfigStore.getState().config);
    updateLighting(updates);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Sun className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-white">灯光环境</span>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-white/60 font-medium">光照预设</div>
        <div className="grid grid-cols-3 gap-2">
          {LIGHTING_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePresetChange(preset.value)}
              className={cn(
                'p-3 rounded-lg border text-center transition-all',
                lighting.preset === preset.value
                  ? 'bg-cyan-500/20 border-cyan-400 text-white'
                  : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/40'
              )}
            >
              <div className="flex justify-center mb-2">
                {presetIcons[preset.value]}
              </div>
              <span className="text-xs">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-3 bg-white/5 rounded-lg">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-white/60" />
          <span className="text-xs text-white/60 font-medium">手动调整</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">主光源强度</span>
              <span className="text-white/80 font-mono">
                {lighting.mainLightIntensity.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={lighting.mainLightIntensity}
              onChange={(e) =>
                handleManualChange({
                  mainLightIntensity: parseFloat(e.target.value)
                })
              }
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">环境光强度</span>
              <span className="text-white/80 font-mono">
                {lighting.ambientIntensity.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={lighting.ambientIntensity}
              onChange={(e) =>
                handleManualChange({
                  ambientIntensity: parseFloat(e.target.value)
                })
              }
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-white/60">主光源位置</div>
            {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis} className="flex items-center gap-2">
                <span className="w-4 text-xs font-mono text-white/60 uppercase">
                  {axis}
                </span>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="1"
                  value={lighting.mainLightPosition[axis]}
                  onChange={(e) =>
                    handleManualChange({
                      mainLightPosition: {
                        ...lighting.mainLightPosition,
                        [axis]: parseInt(e.target.value)
                      }
                    })
                  }
                  className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <span className="w-10 text-right text-xs font-mono text-white/80">
                  {lighting.mainLightPosition[axis]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LightingPanel;
