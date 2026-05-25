import React, { useState, useRef } from 'react';
import { Type, ImagePlus, Trash2, Plus, Move, Maximize2 } from 'lucide-react';
import { useConfigStore, useHistoryStore } from '@/store/useConfigStore';
import { COLOR_PALETTE, DECAL_FONTS } from '@/types';
import type { DecalFont } from '@/types';
import { cn } from '@/lib/utils';

interface DecalEditorProps {
  className?: string;
}

export const DecalEditor = ({ className }: DecalEditorProps) => {
  const decals = useConfigStore((state) => state.config.decals);
  const addDecal = useConfigStore((state) => state.addDecal);
  const removeDecal = useConfigStore((state) => state.removeDecal);
  const { pushHistory } = useHistoryStore();

  const [text, setText] = useState('');
  const [selectedFont, setSelectedFont] = useState<DecalFont>('arial');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [scale, setScale] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddTextDecal = () => {
    if (!text.trim() || text.length > 8) return;

    pushHistory(useConfigStore.getState().config);
    addDecal({
      text: text.trim().toUpperCase(),
      font: selectedFont,
      color: selectedColor,
      position: { x: 0, y: 0 },
      scale
    });
    setText('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      pushHistory(useConfigStore.getState().config);
      addDecal({
        text: '',
        font: 'arial',
        color: '#ffffff',
        position: { x: 0, y: 0 },
        scale,
        badgeImage: base64
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white">贴花自定义</span>
        </div>
        <span className="text-xs text-white/50">
          {decals.length}/5 个贴花
        </span>
      </div>

      <div className="space-y-3 p-3 bg-white/5 rounded-lg">
        <div>
          <label className="block text-xs text-white/60 mb-2">
            文字内容 (最多8个字符)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 8))}
              placeholder="输入文字..."
              maxLength={8}
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleAddTextDecal}
              disabled={!text.trim() || decals.length >= 5}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                text.trim() && decals.length < 5
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-white'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/60 mb-2">字体</label>
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value as DecalFont)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
            >
              {DECAL_FONTS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-2">大小</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full h-8 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-xs text-white/50 text-center mt-1">
              {scale.toFixed(1)}x
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-2">颜色</label>
          <div className="grid grid-cols-8 gap-1">
            {COLOR_PALETTE.slice(0, 8).map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={cn(
                  'w-full aspect-square rounded border-2 transition-all',
                  selectedColor === color
                    ? 'border-cyan-400 ring-1 ring-cyan-400'
                    : 'border-white/20 hover:border-white/40'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-2">
            或上传图片徽章
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={decals.length >= 5}
            className={cn(
              'w-full p-3 rounded-lg border-2 border-dashed transition-all flex items-center justify-center gap-2',
              decals.length < 5
                ? 'border-white/30 hover:border-cyan-400 text-white/70 hover:text-white'
                : 'border-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            <ImagePlus className="w-5 h-5" />
            <span className="text-sm">上传图片</span>
          </button>
        </div>
      </div>

      {decals.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-white/60 font-medium">已添加的贴花</div>
          {decals.map((decal) => (
            <div
              key={decal.id}
              className="p-3 bg-white/5 rounded-lg flex items-center gap-3"
            >
              {decal.badgeImage ? (
                <img
                  src={decal.badgeImage}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold bg-white/10"
                  style={{ color: decal.color }}
                >
                  {decal.text}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">
                  {decal.badgeImage ? '图片徽章' : `文字: ${decal.text}`}
                </div>
                <div className="text-xs text-white/50 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Move className="w-3 h-3" /> 位置可调
                  </span>
                  <span className="flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" /> {decal.scale.toFixed(1)}x
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  pushHistory(useConfigStore.getState().config);
                  removeDecal(decal.id);
                }}
                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DecalEditor;
