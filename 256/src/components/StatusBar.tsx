import { Activity, Box, Layers } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface StatusBarProps {
  vertexCount: number;
  fps: number;
}

export function StatusBar({ vertexCount, fps }: StatusBarProps) {
  const { fluidParams, recordState } = useStore();

  const getModeLabel = () => {
    return fluidParams.mode === 'turbulence' ? '湍流模式' : '呼吸模式';
  };

  const getModeColor = () => {
    return fluidParams.mode === 'turbulence' ? 'text-cyan-400' : 'text-pink-400';
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 bg-black/60 backdrop-blur-xl rounded-full border border-white/10">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-green-400" />
        <span className="text-xs text-gray-400">FPS</span>
        <span className={`font-mono text-sm ${fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
          {fps}
        </span>
      </div>

      <div className="w-px h-4 bg-white/20" />

      <div className="flex items-center gap-2">
        <Box className="w-4 h-4 text-purple-400" />
        <span className="text-xs text-gray-400">顶点</span>
        <span className="font-mono text-sm text-purple-400">
          {vertexCount.toLocaleString()}
        </span>
      </div>

      <div className="w-px h-4 bg-white/20" />

      <div className="flex items-center gap-2">
        <Layers className={`w-4 h-4 ${getModeColor()}`} />
        <span className="text-xs text-gray-400">模式</span>
        <span className={`font-medium text-sm ${getModeColor()}`}>
          {getModeLabel()}
        </span>
      </div>

      {recordState.isRecording && (
        <>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-400">录制中 {Math.round(recordState.progress)}%</span>
          </div>
        </>
      )}
    </div>
  );
}
