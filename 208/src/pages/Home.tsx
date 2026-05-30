import { useState, useCallback, useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { Scene3D } from '../three/Scene3D';
import { ControlPanel } from '../components/ControlPanel';
import { StyleInfoCard } from '../components/StyleInfoCard';
import { Toolbar } from '../components/Toolbar';
import { captureScreenshot } from '../utils/export';
import { getStyleTextureUrl } from '../data/styleTextures';
import type { CubeFace } from '../types';
import { useStyleTransfer } from '../hooks/useStyleTransfer';

export default function Home() {
  const {
    styleIntensity,
    setStyleIntensity,
    faceStyles,
    selectedFace,
    setSelectedFace,
    setFaceStyle,
    contentImage,
    setContentImage,
    backgroundType,
    setBackgroundType,
    autoRotate,
    setAutoRotate,
    rotationSpeed,
    setRotationSpeed,
    resetToDefaults,
  } = useAppStore();

  const [stylizedContentImage, setStylizedContentImage] = useState<string | null>(null);
  const [showStyleTransferButton, setShowStyleTransferButton] = useState(false);

  const {
    isProcessing: isStyleTransferProcessing,
    progress: styleTransferProgress,
    error: styleTransferError,
    stylize,
    loadModel,
    isModelLoaded,
  } = useStyleTransfer();

  useEffect(() => {
    setShowStyleTransferButton(!!contentImage && isModelLoaded);
  }, [contentImage, isModelLoaded]);

  const handleFaceClick = useCallback((face: CubeFace) => {
    setSelectedFace(face);
  }, [setSelectedFace]);

  const handleScreenshot = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    captureScreenshot(`neural-style-cube-${timestamp}.png`);
  }, []);

  const handleExportTextures = useCallback(() => {
    const faces: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
    faces.forEach((face) => {
      const style = faceStyles[face];
      const textureUrl = getStyleTextureUrl(style.id);
      if (textureUrl) {
        const link = document.createElement('a');
        link.download = `${face}-${style.id.replace(/-/g, '_')}.png`;
        link.href = textureUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  }, [faceStyles]);

  const handleApplyStyleTransfer = useCallback(async () => {
    if (!contentImage) return;

    try {
      const contentImg = new Image();
      contentImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        contentImg.onload = () => resolve();
        contentImg.onerror = reject;
        contentImg.src = contentImage;
      });

      const currentStyle = faceStyles[selectedFace];
      const styleTextureUrl = getStyleTextureUrl(currentStyle.id);

      if (!styleTextureUrl) {
        console.error('No style texture URL available');
        return;
      }

      const styleImg = new Image();
      styleImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        styleImg.onload = () => resolve();
        styleImg.onerror = reject;
        styleImg.src = styleTextureUrl;
      });

      const result = await stylize(contentImg, styleImg, styleIntensity);
      if (result) {
        setStylizedContentImage(result);
      }
    } catch (error) {
      console.error('Style transfer failed:', error);
    }
  }, [contentImage, faceStyles, selectedFace, styleIntensity, stylize]);

  const currentStyle = faceStyles[selectedFace];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      <ControlPanel
        styleIntensity={styleIntensity}
        setStyleIntensity={setStyleIntensity}
        selectedFace={selectedFace}
        setSelectedFace={setSelectedFace}
        currentStyle={currentStyle}
        setFaceStyle={setFaceStyle}
        contentImage={contentImage}
        setContentImage={setContentImage}
        autoRotate={autoRotate}
        setAutoRotate={setAutoRotate}
        rotationSpeed={rotationSpeed}
        setRotationSpeed={setRotationSpeed}
      />

      <div className="flex-1 relative">
        <Scene3D
          faceStyles={faceStyles}
          styleIntensity={styleIntensity}
          contentImage={stylizedContentImage || contentImage}
          backgroundType={backgroundType}
          autoRotate={autoRotate}
          rotationSpeed={rotationSpeed}
          onFaceClick={handleFaceClick}
        />

        {showStyleTransferButton && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={handleApplyStyleTransfer}
              disabled={isStyleTransferProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStyleTransferProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">风格迁移中 {styleTransferProgress}%</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">应用AI风格迁移</span>
                </>
              )}
            </button>
            {styleTransferError && (
              <p className="text-xs text-red-400 mt-2 bg-red-900/50 px-3 py-1 rounded-lg">
                {styleTransferError}
              </p>
            )}
          </div>
        )}

        {!isModelLoaded && contentImage && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span className="text-sm text-slate-300">正在加载AI模型...</span>
            </div>
          </div>
        )}

        <Toolbar
          backgroundType={backgroundType}
          setBackgroundType={setBackgroundType}
          onScreenshot={handleScreenshot}
          onExportTextures={handleExportTextures}
          onReset={resetToDefaults}
        />

        <div className="absolute top-4 left-4 z-10">
          <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-400">拖拽旋转 • 滚轮缩放 • 点击面选择</p>
          </div>
        </div>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="px-4 py-2 bg-gradient-to-r from-purple-900/80 to-cyan-900/80 backdrop-blur-md rounded-full border border-purple-500/30">
            <p className="text-xs text-purple-200 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              6面不同艺术风格 • 实时风格迁移
            </p>
          </div>
        </div>

        {isStyleTransferProcessing && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 text-center max-w-md">
              <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">AI风格迁移中</h3>
              <p className="text-slate-400 text-sm mb-4">
                正在将 <span className="text-purple-400 font-medium">{currentStyle.nameCn}</span> 风格应用到您的图片...
              </p>
              <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${styleTransferProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">{styleTransferProgress}%</p>
            </div>
          </div>
        )}
      </div>

      <StyleInfoCard style={currentStyle} face={selectedFace} />
    </div>
  );
}
