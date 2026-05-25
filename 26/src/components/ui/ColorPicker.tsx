import React, { useState, useMemo } from 'react';
import { Palette, Sliders } from 'lucide-react';
import { COLOR_PALETTE } from '@/types';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from '@/utils/colorUtils';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

export const ColorPicker = ({ color, onChange, className }: ColorPickerProps) => {
  const [showCustom, setShowCustom] = useState(false);
  const rgb = useMemo(() => hexToRgb(color), [color]);
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgb, [channel]: value };
    onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleHslChange = (channel: 'h' | 's' | 'l', value: number) => {
    const newHsl = { ...hsl, [channel]: value };
    const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-white">颜色选择</span>
      </div>

      <div className="grid grid-cols-8 gap-2">
        {COLOR_PALETTE.map((presetColor) => (
          <button
            key={presetColor}
            onClick={() => onChange(presetColor)}
            className={cn(
              'w-full aspect-square rounded-lg border-2 transition-all hover:scale-110',
              color === presetColor
                ? 'border-cyan-400 ring-2 ring-cyan-400/50'
                : 'border-white/20 hover:border-white/40'
            )}
            style={{ backgroundColor: presetColor }}
            title={presetColor}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <div
          className="w-12 h-12 rounded-lg border-2 border-white/30"
          style={{ backgroundColor: color }}
        />
        <input
          type="text"
          value={color.toUpperCase()}
          onChange={(e) => {
            const value = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
              onChange(value);
            }
          }}
          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-400"
          placeholder="#000000"
        />
      </div>

      <button
        onClick={() => setShowCustom(!showCustom)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 text-sm transition-colors"
      >
        <Sliders className="w-4 h-4" />
        {showCustom ? '隐藏高级选项' : '显示高级选项'}
      </button>

      {showCustom && (
        <div className="space-y-4 p-4 bg-black/30 rounded-lg">
          <div className="space-y-3">
            <div className="text-xs text-white/60 font-medium">RGB</div>
            {(['r', 'g', 'b'] as const).map((channel) => (
              <div key={channel} className="flex items-center gap-3">
                <span className="w-6 text-xs font-mono text-white/60 uppercase">
                  {channel}
                </span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgb[channel]}
                  onChange={(e) => handleRgbChange(channel, parseInt(e.target.value))}
                  className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${channel === 'r' ? '#ff0000' : channel === 'g' ? '#00ff00' : '#0000ff'}, ${channel === 'r' ? '#ffff00' : channel === 'g' ? '#00ffff' : '#ff00ff'})`
                  }}
                />
                <span className="w-10 text-right text-xs font-mono text-white/80">
                  {rgb[channel]}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="text-xs text-white/60 font-medium">HSL</div>
            {(['h', 's', 'l'] as const).map((channel) => (
              <div key={channel} className="flex items-center gap-3">
                <span className="w-6 text-xs font-mono text-white/60 uppercase">
                  {channel}
                </span>
                <input
                  type="range"
                  min={channel === 'h' ? 0 : 0}
                  max={channel === 'h' ? 360 : 100}
                  value={hsl[channel]}
                  onChange={(e) => handleHslChange(channel, parseInt(e.target.value))}
                  className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <span className="w-10 text-right text-xs font-mono text-white/80">
                  {hsl[channel]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
