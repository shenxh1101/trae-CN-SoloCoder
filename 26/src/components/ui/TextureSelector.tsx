import React from 'react';
import { Grid3X3 } from 'lucide-react';
import { TEXTURE_PATTERNS, SHOE_PARTS_INFO } from '@/types';
import type { ShoePart, TexturePattern } from '@/types';
import { generateTexture } from '@/utils/textureGenerator';
import { cn } from '@/lib/utils';

interface TextureSelectorProps {
  part: ShoePart;
  texture: TexturePattern;
  color: string;
  onChange: (texture: TexturePattern) => void;
  className?: string;
}

export const TextureSelector = ({ part, texture, color, onChange, className }: TextureSelectorProps) => {
  const partInfo = SHOE_PARTS_INFO[part];
  const availableTextures = partInfo.availableTextures;

  const textures = TEXTURE_PATTERNS.filter(t => availableTextures.includes(t.value));

  const getTexturePreview = (pattern: TexturePattern, baseColor: string) => {
    const texture = generateTexture(pattern, baseColor);
    const canvas = texture.image as HTMLCanvasElement;
    return canvas.toDataURL();
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Grid3X3 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-white">纹理图案</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {textures.map((tex) => (
          <button
            key={tex.value}
            onClick={() => onChange(tex.value)}
            className={cn(
              'p-2 rounded-lg border transition-all group',
              texture === tex.value
                ? 'bg-cyan-500/20 border-cyan-400'
                : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40'
            )}
          >
            <div
              className="w-full aspect-square rounded-md mb-2 overflow-hidden border border-white/10"
              style={{
                backgroundImage: `url(${getTexturePreview(tex.value, color)})`,
                backgroundSize: 'cover'
              }}
            />
            <span className="text-xs text-center text-white/70 group-hover:text-white block">
              {tex.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TextureSelector;
