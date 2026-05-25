import React from 'react';
import { Layers } from 'lucide-react';
import { UPPER_MATERIALS, SOLE_MATERIALS, SHOE_PARTS_INFO } from '@/types';
import type { ShoePart, MaterialType } from '@/types';
import { cn } from '@/lib/utils';

interface MaterialSelectorProps {
  part: ShoePart;
  material: MaterialType;
  onChange: (material: MaterialType) => void;
  className?: string;
}

const materialIcons: Record<string, string> = {
  leather: '🧵',
  mesh: '🕸️',
  suede: '🪶',
  reflective: '✨',
  rubber: '⚫',
  eva: '⚪',
  carbon: '💎'
};

export const MaterialSelector = ({ part, material, onChange, className }: MaterialSelectorProps) => {
  const partInfo = SHOE_PARTS_INFO[part];
  const availableMaterials = partInfo.availableMaterials;

  const materials = part === 'sole' || part === 'heel'
    ? SOLE_MATERIALS.filter(m => availableMaterials.includes(m.value))
    : UPPER_MATERIALS.filter(m => availableMaterials.includes(m.value));

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-white">材质选择</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {materials.map((mat) => (
          <button
            key={mat.value}
            onClick={() => onChange(mat.value)}
            className={cn(
              'p-3 rounded-lg border text-left transition-all',
              material === mat.value
                ? 'bg-cyan-500/20 border-cyan-400 text-white'
                : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/40'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{materialIcons[mat.value]}</span>
              <span className="text-sm font-medium">{mat.label}</span>
            </div>
            <p className="text-xs text-white/50 line-clamp-2">{mat.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MaterialSelector;
