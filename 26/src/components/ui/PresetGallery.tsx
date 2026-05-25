import React from 'react';
import { Palette, Check } from 'lucide-react';
import { useConfigStore, useHistoryStore } from '@/store/useConfigStore';
import { PRESET_SCHEMES } from '@/data/presets';
import { cn } from '@/lib/utils';

interface PresetGalleryProps {
  className?: string;
}

export const PresetGallery = ({ className }: PresetGalleryProps) => {
  const config = useConfigStore((state) => state.config);
  const applyPreset = useConfigStore((state) => state.applyPreset);
  const { pushHistory } = useHistoryStore();

  const handleApplyPreset = (preset: typeof PRESET_SCHEMES[0]) => {
    pushHistory(useConfigStore.getState().config);
    applyPreset(preset.config);
  };

  const getPresetPreview = (preset: typeof PRESET_SCHEMES[0]) => {
    const upperColor = preset.config.parts?.upper?.color || '#333';
    const soleColor = preset.config.parts?.sole?.color || '#666';
    const accentColor = preset.config.parts?.logo?.color || '#fff';

    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden relative bg-gradient-to-br from-gray-900 to-gray-800">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 30% 50%, ${upperColor}40 0%, transparent 50%), radial-gradient(circle at 70% 50%, ${soleColor}40 0%, transparent 50%)`
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-2">
            <div
              className="w-6 h-6 rounded-full border-2 border-white/30"
              style={{ backgroundColor: upperColor }}
            />
            <div
              className="w-6 h-6 rounded-full border-2 border-white/30"
              style={{ backgroundColor: soleColor }}
            />
            <div
              className="w-6 h-6 rounded-full border-2 border-white/30"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-white">设计师预设</span>
      </div>

      <div className="space-y-3">
        {PRESET_SCHEMES.map((preset) => {
          const isCurrent =
            config.parts.upper.color === preset.config.parts?.upper?.color &&
            config.parts.sole.color === preset.config.parts?.sole?.color;

          return (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className={cn(
                'w-full p-3 rounded-lg border text-left transition-all group',
                isCurrent
                  ? 'bg-cyan-500/20 border-cyan-400'
                  : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40'
              )}
            >
              <div className="relative">
                {getPresetPreview(preset)}
                {isCurrent && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    {preset.name}
                  </span>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      isCurrent
                        ? 'bg-cyan-500/30 text-cyan-300'
                        : 'bg-white/10 text-white/60'
                    )}
                  >
                    {isCurrent ? '当前' : '点击应用'}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-1 line-clamp-2">
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PresetGallery;
