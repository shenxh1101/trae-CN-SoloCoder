import React from 'react';
import { Box } from 'lucide-react';
import { SHOE_PARTS_INFO } from '@/types';
import type { ShoePart } from '@/types';
import { useConfigStore, useHistoryStore } from '@/store/useConfigStore';
import { cn } from '@/lib/utils';

interface PartSelectorProps {
  className?: string;
}

const partIcons: Record<ShoePart, string> = {
  upper: '👟',
  sole: '👞',
  laces: '🎀',
  logo: '🏷️',
  heel: '🔶',
  tongue: '👅',
  lining: '🧦'
};

export const PartSelector = ({ className }: PartSelectorProps) => {
  const selectedPart = useConfigStore((state) => state.selectedPart);
  const setSelectedPart = useConfigStore((state) => state.setSelectedPart);
  const parts = useConfigStore((state) => state.config.parts);
  const { pushHistory } = useHistoryStore.getState();

  const handlePartSelect = (part: ShoePart) => {
    pushHistory(useConfigStore.getState().config);
    setSelectedPart(part);
  };

  const partList = Object.entries(SHOE_PARTS_INFO) as [ShoePart, typeof SHOE_PARTS_INFO[ShoePart]][];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Box className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-white">部件选择</span>
      </div>

      <div className="space-y-2">
        {partList.map(([key, info], index) => (
          <button
            key={key}
            onClick={() => handlePartSelect(key)}
            className={cn(
              'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
              selectedPart === key
                ? 'bg-cyan-500/20 border-cyan-400'
                : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40'
            )}
          >
            <span className="text-xs text-white/40 font-mono w-4">
              {index + 1}
            </span>
            <span className="text-2xl">{partIcons[key]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">
                  {info.name}
                </span>
                <span className="text-xs text-white/40">
                  {info.nameEn}
                </span>
              </div>
              <p className="text-xs text-white/50 truncate">
                {info.description}
              </p>
            </div>
            <div
              className="w-8 h-8 rounded-full border-2 border-white/30 shrink-0"
              style={{ backgroundColor: parts[key].color }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default PartSelector;
