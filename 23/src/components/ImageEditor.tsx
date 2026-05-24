import { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useImageProcessing } from '../hooks/useImageProcessing';
import type { PendingImage } from '../../shared/types';

interface ImageEditorProps {
  image: PendingImage;
  onClose: () => void;
}

export function ImageEditor({ image, onClose }: ImageEditorProps) {
  const { updateImageTransform, updateProcessedPreview } = useAppStore();
  const { applyTransformToCanvas, loadImage } = useImageProcessing();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);

  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const loadSource = async () => {
      const img = await loadImage(image.preview);
      sourceImageRef.current = img;
      renderPreview();
    };
    loadSource();
  }, [image.preview, image.transform, loadImage]);

  const renderPreview = () => {
    if (!canvasRef.current || !sourceImageRef.current) return;
    applyTransformToCanvas(
      sourceImageRef.current,
      image.transform,
      canvasRef.current
    );
  };

  const handleRotate = (degrees: number) => {
    const newRotation = (image.transform.rotation + degrees + 360) % 360;
    updateImageTransform(image.id, { rotation: newRotation });
  };

  const handleFlipH = () => {
    updateImageTransform(image.id, { flipH: !image.transform.flipH });
  };

  const handleFlipV = () => {
    updateImageTransform(image.id, { flipV: !image.transform.flipV });
  };

  const handleReset = () => {
    updateImageTransform(image.id, {
      rotation: 0,
      flipH: false,
      flipV: false,
      crop: undefined,
    });
    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setCropStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setCropEnd(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !cropStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setCropEnd({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleCanvasMouseUp = () => {
    if (!isCropping || !cropStart || !cropEnd || !canvasRef.current || !sourceImageRef.current) return;

    const canvas = canvasRef.current;
    const img = sourceImageRef.current;
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    const x = Math.min(cropStart.x, cropEnd.x) * scaleX;
    const y = Math.min(cropStart.y, cropEnd.y) * scaleY;
    const width = Math.abs(cropEnd.x - cropStart.x) * scaleX;
    const height = Math.abs(cropEnd.y - cropStart.y) * scaleY;

    if (width > 10 && height > 10) {
      updateImageTransform(image.id, {
        crop: { x, y, width, height },
      });
    }

    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
  };

  const handleSave = async () => {
    if (canvasRef.current) {
      const processed = canvasRef.current.toDataURL('image/jpeg', 0.9);
      updateProcessedPreview(image.id, processed);
    }
    onClose();
  };

  const getCropStyle = () => {
    if (!cropStart || !cropEnd) return {};
    return {
      left: Math.min(cropStart.x, cropEnd.x),
      top: Math.min(cropStart.y, cropEnd.y),
      width: Math.abs(cropEnd.x - cropStart.x),
      height: Math.abs(cropEnd.y - cropStart.y),
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/90 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-4xl mx-4 overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h3 className="text-lg font-semibold text-dark-100">图片增强</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-dark-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-6">
            <div className="flex-1">
              <div
                className={`relative rounded-xl overflow-hidden bg-dark-900 ${
                  isCropping ? 'cursor-crosshair' : 'cursor-default'
                }`}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  className="max-w-full max-h-[400px] mx-auto block"
                />
                {isCropping && cropStart && cropEnd && (
                  <div
                    className="absolute border-2 border-primary-400 bg-primary-500/20 pointer-events-none"
                    style={getCropStyle()}
                  />
                )}
                {isCropping && (
                  <div className="absolute inset-0 bg-dark-950/50 pointer-events-none">
                    {cropStart && cropEnd && (
                      <>
                        <div
                          className="absolute bg-dark-950/70"
                          style={{
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: Math.min(cropStart.y, cropEnd.y),
                          }}
                        />
                        <div
                          className="absolute bg-dark-950/70"
                          style={{
                            left: 0,
                            top: Math.max(cropStart.y, cropEnd.y),
                            width: '100%',
                            height: '100%',
                          }}
                        />
                        <div
                          className="absolute bg-dark-950/70"
                          style={{
                            left: 0,
                            top: Math.min(cropStart.y, cropEnd.y),
                            width: Math.min(cropStart.x, cropEnd.x),
                            height: Math.abs(cropEnd.y - cropStart.y),
                          }}
                        />
                        <div
                          className="absolute bg-dark-950/70"
                          style={{
                            left: Math.max(cropStart.x, cropEnd.x),
                            top: Math.min(cropStart.y, cropEnd.y),
                            width: '100%',
                            height: Math.abs(cropEnd.y - cropStart.y),
                          }}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-48 space-y-3">
              <p className="text-sm font-medium text-dark-300 mb-2">操作</p>

              <button
                onClick={() => handleRotate(90)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-700/50 hover:bg-dark-600/50 text-dark-200 transition-all"
              >
                <RotateCw className="w-5 h-5" />
                旋转 90°
              </button>

              <button
                onClick={handleFlipH}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  image.transform.flipH
                    ? 'bg-primary-500/30 text-primary-200 border border-primary-500/40'
                    : 'bg-dark-700/50 hover:bg-dark-600/50 text-dark-200'
                }`}
              >
                <FlipHorizontal className="w-5 h-5" />
                水平翻转
              </button>

              <button
                onClick={handleFlipV}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  image.transform.flipV
                    ? 'bg-primary-500/30 text-primary-200 border border-primary-500/40'
                    : 'bg-dark-700/50 hover:bg-dark-600/50 text-dark-200'
                }`}
              >
                <FlipVertical className="w-5 h-5" />
                垂直翻转
              </button>

              <button
                onClick={() => setIsCropping(!isCropping)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isCropping
                    ? 'bg-accent-500/30 text-accent-200 border border-accent-500/40'
                    : 'bg-dark-700/50 hover:bg-dark-600/50 text-dark-200'
                }`}
              >
                <Crop className="w-5 h-5" />
                {isCropping ? '取消裁剪' : '自由裁剪'}
              </button>

              <button
                onClick={handleReset}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-700/50 hover:bg-dark-600/50 text-dark-200 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                重置
              </button>

              {isCropping && (
                <p className="text-xs text-dark-500 px-1">
                  在图片上拖动鼠标选择裁剪区域
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-dark-700 bg-dark-800/30">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Check className="w-5 h-5" />
            应用更改
          </button>
        </div>
      </div>
    </div>
  );
}
