import { useRef, useCallback } from 'react';
import { Upload, RotateCw, Sliders, Palette, Image as ImageIcon, X } from 'lucide-react';
import type { ArtStyle, CubeFace } from '../types';
import { artStyles } from '../data/styles';

interface ControlPanelProps {
  styleIntensity: number;
  setStyleIntensity: (value: number) => void;
  selectedFace: CubeFace;
  setSelectedFace: (face: CubeFace) => void;
  currentStyle: ArtStyle;
  setFaceStyle: (face: CubeFace, style: ArtStyle) => void;
  contentImage: string | null;
  setContentImage: (image: string | null) => void;
  autoRotate: boolean;
  setAutoRotate: (value: boolean) => void;
  rotationSpeed: number;
  setRotationSpeed: (value: number) => void;
}

const faceLabels: Record<CubeFace, string> = {
  front: '正面',
  back: '背面',
  left: '左面',
  right: '右面',
  top: '顶面',
  bottom: '底面',
};

const faceOrder: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

export function ControlPanel({
  styleIntensity,
  setStyleIntensity,
  selectedFace,
  setSelectedFace,
  currentStyle,
  setFaceStyle,
  contentImage,
  setContentImage,
  autoRotate,
  setAutoRotate,
  rotationSpeed,
  setRotationSpeed,
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setContentImage(result);
        };
        reader.readAsDataURL(file);
      }
    },
    [setContentImage]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setContentImage(result);
        };
        reader.readAsDataURL(file);
      }
    },
    [setContentImage]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className="w-80 bg-slate-900/90 backdrop-blur-xl border-r border-slate-700/50 h-full overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <Palette className="w-6 h-6 text-purple-400" />
          神经风格立方体
        </h1>
        <p className="text-slate-400 text-sm mb-6">AI Art Style Transfer Cube</p>

        <div className="mb-6">
          <label className="text-sm font-medium text-slate-300 mb-3 block flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            风格混合强度
          </label>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={styleIntensity}
              onChange={(e) => setStyleIntensity(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>原图</span>
              <span className="text-purple-400 font-medium">{Math.round(styleIntensity * 100)}%</span>
              <span>风格</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium text-slate-300 mb-3 block">选择立方体面</label>
          <div className="grid grid-cols-3 gap-2">
            {faceOrder.map((face) => (
              <button
                key={face}
                onClick={() => setSelectedFace(face)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedFace === face
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                }`}
              >
                {faceLabels[face]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium text-slate-300 mb-3 block">选择艺术风格</label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {artStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => setFaceStyle(selectedFace, style)}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all flex items-center gap-3 ${
                  currentStyle.id === style.id
                    ? 'bg-slate-700 ring-2 ring-purple-500'
                    : 'bg-slate-800/50 hover:bg-slate-700/50'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: style.baseColor }}
                />
                <div>
                  <div className="text-sm font-medium text-white">{style.nameCn}</div>
                  <div className="text-xs text-slate-500">{style.author}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium text-slate-300 mb-3 block flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            上传内容图片
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-purple-500 hover:bg-slate-800/50 transition-all group"
          >
            {contentImage ? (
              <div className="relative">
                <img
                  src={contentImage}
                  alt="Content"
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContentImage(null);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto text-slate-500 mb-2 group-hover:text-purple-400 transition-colors" />
                <p className="text-sm text-slate-500">点击或拖拽上传图片</p>
                <p className="text-xs text-slate-600 mt-1">支持 JPG, PNG, WebP</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium text-slate-300 mb-3 block flex items-center gap-2">
            <RotateCw className="w-4 h-4" />
            自动旋转
          </label>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">启用自动旋转</span>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`w-12 h-6 rounded-full transition-all ${
                autoRotate ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                  autoRotate ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {autoRotate && (
            <div className="relative">
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>慢</span>
                <span>快</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
