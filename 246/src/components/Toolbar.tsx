import { useCallback, useRef, useState, useEffect } from 'react';
import { Camera, FileJson, Music, Music2, Circle, Square, Loader } from 'lucide-react';
import { useCloudStore } from '@/store/useCloudStore';
import type { CloudSceneConfig } from '@/types';

const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 20, 40];

declare global {
  interface Window {
    GIF: any;
  }
}

function loadGifJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.GIF) {
      resolve(window.GIF);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.min.js';
    script.onload = () => resolve(window.GIF);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function getCanvas(): HTMLCanvasElement | null {
  const container = document.querySelector('[data-canvas-container]');
  if (container) {
    const canvas = container.querySelector('canvas');
    if (canvas) return canvas;
  }
  return document.querySelector('canvas');
}

export default function Toolbar() {
  const {
    poem, analysis, cloudPreset, cameraMode, cameraPosition,
    musicEnabled, setMusicEnabled,
    musicType, setMusicType,
    isRecording, setIsRecording,
    setCameraPosition,
  } = useCloudStore();

  const [showMusicMenu, setShowMusicMenu] = useState(false);
  const [gifJsLoaded, setGifJsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gifRef = useRef<any>(null);
  const framesRef = useRef<number>(0);

  useEffect(() => {
    loadGifJs()
      .then(() => setGifJsLoaded(true))
      .catch(() => setGifJsLoaded(false));
  }, []);

  useEffect(() => {
    if (cameraPosition[0] === 0 && cameraPosition[1] === 0 && cameraPosition[2] === 0) {
      setCameraPosition(...DEFAULT_CAMERA_POSITION);
    }
  }, [cameraPosition, setCameraPosition]);

  const handleScreenshot = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) {
      console.error('Canvas not found for screenshot');
      return;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      if (!dataUrl || dataUrl === 'data:,') {
        console.error('Canvas toDataURL returned empty');
        return;
      }
      const link = document.createElement('a');
      link.download = `dream-cloud-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('Screenshot saved successfully');
    } catch (e) {
      console.error('Screenshot failed:', e);
    }
  }, []);

  const handleExportJSON = useCallback(() => {
    const validCameraPosition: [number, number, number] =
      cameraPosition && cameraPosition.length === 3 && !cameraPosition.some(v => isNaN(v))
        ? cameraPosition
        : DEFAULT_CAMERA_POSITION;

    const config: CloudSceneConfig = {
      poem,
      analysis,
      cloudPreset,
      cameraPosition: validCameraPosition,
      cameraMode,
      musicEnabled,
      musicType,
    };

    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `cloud-config-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    console.log('JSON exported:', jsonStr.substring(0, 200));
  }, [poem, analysis, cloudPreset, cameraPosition, cameraMode, musicEnabled, musicType]);

  const handleStartRecording = useCallback(async () => {
    const canvas = getCanvas();
    if (!canvas) {
      console.error('Canvas not found for recording');
      return;
    }

    setIsRecording(true);
    framesRef.current = 0;

    if (gifJsLoaded && window.GIF) {
      try {
        const targetWidth = Math.min(canvas.width, 480);
        const targetHeight = Math.min(canvas.height, 360);
        gifRef.current = new window.GIF({
          workers: 1,
          quality: 10,
          width: targetWidth,
          height: targetHeight,
          workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
        });
        console.log(`GIF initialized: ${targetWidth}x${targetHeight}`);
      } catch (e) {
        console.error('Failed to initialize GIF:', e);
        gifRef.current = null;
      }
    }

    const captureFrame = () => {
      const currentCanvas = getCanvas();
      if (!currentCanvas) return;

      try {
        if (gifRef.current) {
          const scaledCanvas = document.createElement('canvas');
          const tw = Math.min(currentCanvas.width, 480);
          const th = Math.min(currentCanvas.height, 360);
          scaledCanvas.width = tw;
          scaledCanvas.height = th;
          const sctx = scaledCanvas.getContext('2d');
          if (sctx) {
            sctx.drawImage(currentCanvas, 0, 0, tw, th);
            gifRef.current.addFrame(scaledCanvas, { delay: 100, copy: true });
            framesRef.current++;
          }
        }
      } catch (e) {
        console.error('Frame capture error:', e);
      }

      if (framesRef.current > 150) {
        handleStopRecording();
      }
    };

    captureFrame();
    recordingIntervalRef.current = setInterval(captureFrame, 100);
  }, [gifJsLoaded, setIsRecording]);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    const totalFrames = framesRef.current;

    if (gifRef.current && totalFrames > 0) {
      setIsProcessing(true);
      console.log(`Rendering GIF with ${totalFrames} frames...`);
      try {
        gifRef.current.on('finished', (blob: Blob) => {
          const link = document.createElement('a');
          link.download = `dream-cloud-${Date.now()}.gif`;
          link.href = URL.createObjectURL(blob);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
          setIsProcessing(false);
          gifRef.current = null;
          framesRef.current = 0;
          console.log(`GIF saved: ${(blob.size / 1024).toFixed(1)} KB`);
        });
        gifRef.current.render();
      } catch (e) {
        console.error('GIF rendering failed:', e);
        setIsProcessing(false);
        gifRef.current = null;
      }
    } else {
      console.log('No frames captured, saving fallback PNG');
      const canvas = getCanvas();
      if (canvas) {
        const link = document.createElement('a');
        link.download = `dream-cloud-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }, [setIsRecording]);

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <div className="glass-panel p-1.5 flex flex-col gap-1">
        <button
          onClick={handleScreenshot}
          className="toolbar-btn"
          title="截图保存 PNG"
        >
          <Camera size={16} />
        </button>

        {isProcessing ? (
          <button
            disabled
            className="toolbar-btn text-yellow-400 cursor-wait"
            title="正在生成 GIF..."
          >
            <Loader size={16} className="animate-spin" />
          </button>
        ) : isRecording ? (
          <button
            onClick={handleStopRecording}
            className="toolbar-btn text-red-400 hover:text-red-300"
            title="停止录制"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={handleStartRecording}
            className={`toolbar-btn ${!gifJsLoaded ? 'opacity-50' : ''}`}
            title={gifJsLoaded ? "录制 GIF" : "GIF库加载中..."}
          >
            <Circle size={16} />
          </button>
        )}

        <button
          onClick={handleExportJSON}
          className="toolbar-btn"
          title="导出 JSON 配置"
        >
          <FileJson size={16} />
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setShowMusicMenu(!showMusicMenu);
              if (!musicEnabled) {
                setMusicEnabled(true);
              }
            }}
            className={`toolbar-btn ${musicEnabled ? 'text-gold' : ''}`}
            title="背景音乐"
          >
            {musicEnabled ? <Music2 size={16} /> : <Music size={16} />}
          </button>

          {showMusicMenu && (
            <div className="absolute top-0 right-full mr-2 glass-panel p-2 flex flex-col gap-1 min-w-[100px]">
              <button
                onClick={() => { setMusicType('guqin'); setShowMusicMenu(false); }}
                className={`text-xs px-2 py-1 rounded text-left transition-all ${
                  musicType === 'guqin' ? 'text-gold bg-gold/10' : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                🎵 古琴
              </button>
              <button
                onClick={() => { setMusicType('nature'); setShowMusicMenu(false); }}
                className={`text-xs px-2 py-1 rounded text-left transition-all ${
                  musicType === 'nature' ? 'text-gold bg-gold/10' : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                🌿 自然音
              </button>
              <button
                onClick={() => { setMusicEnabled(false); setShowMusicMenu(false); }}
                className="text-xs px-2 py-1 rounded text-left text-white/40 hover:text-white/60 hover:bg-white/5 transition-all"
              >
                🔇 静音
              </button>
            </div>
          )}
        </div>
      </div>

      {isRecording && (
        <div className="glass-panel px-2 py-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] text-red-400 font-mono">
            REC {framesRef.current}帧
          </span>
        </div>
      )}
      {isProcessing && (
        <div className="glass-panel px-2 py-1 flex items-center gap-1.5">
          <Loader size={10} className="animate-spin text-yellow-400" />
          <span className="text-[10px] text-yellow-400 font-mono">生成中...</span>
        </div>
      )}
    </div>
  );
}
