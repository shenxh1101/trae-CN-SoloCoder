import { useStats, useConfig, usePosition, useCameraMode } from '../../store/useSceneStore';
import { StyleSystem } from '../../core/StyleSystem';
import { Footprints, Clock, Layers, Eye } from 'lucide-react';

export function HUD() {
  const stats = useStats();
  const config = useConfig();
  const position = usePosition();
  const cameraMode = useCameraMode();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-lg p-4 min-w-[220px] shadow-lg shadow-cyan-500/10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-400 font-mono text-sm font-bold tracking-wider">
            ENDLESS STAIRS
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Footprints size={14} />
              <span className="font-mono">阶梯数</span>
            </div>
            <span className="text-white font-mono font-bold">
              {stats.stairCount}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock size={14} />
              <span className="font-mono">时间</span>
            </div>
            <span className="text-white font-mono font-bold">
              {formatTime(stats.totalTime)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Layers size={14} />
              <span className="font-mono">当前位置</span>
            </div>
            <span className="text-white font-mono font-bold">
              #{position.stairIndex}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Eye size={14} />
              <span className="font-mono">视角</span>
            </div>
            <span className="text-white font-mono font-bold">
              {cameraMode === 'firstPerson' ? '第一人称' : '第三人称'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-700/50">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">风格</span>
              <div className="text-cyan-400 font-mono">
                {StyleSystem.getStyleDisplayName(config.style)}
              </div>
            </div>
            <div>
              <span className="text-gray-500">背景</span>
              <div className="text-purple-400 font-mono">
                {StyleSystem.getBackgroundDisplayName(config.background)}
              </div>
            </div>
          </div>
          
          <div className="mt-2">
            <span className="text-gray-500 text-xs">种子</span>
            <div className="text-gray-300 font-mono text-xs truncate" title={config.seed}>
              {config.seed}
            </div>
          </div>
        </div>

        {stats.walking && (
          <div className="mt-3 flex items-center gap-2 text-green-400 text-xs font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            行走中...
          </div>
        )}

        {config.autoWalk && (
          <div className="mt-2 flex items-center gap-2 text-yellow-400 text-xs font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            自动行走模式
          </div>
        )}
      </div>
    </div>
  );
}
