import { Camera, Download, Upload, RotateCcw, Sparkles } from 'lucide-react';
import type { WebGLRenderer } from 'three';
import { Slider } from './Slider';
import { Toggle } from './Toggle';
import { Button } from './Button';
import { useGalaxyStore } from '../store/useGalaxyStore';
import { CONFIG_RANGES } from '../types/galaxy';
import { takeScreenshot } from '../utils/screenshot';
import { exportConfig, importConfig } from '../utils/jsonIO';

interface ControlPanelProps {
  gl: WebGLRenderer | null;
}

export function ControlPanel({ gl }: ControlPanelProps) {
  const config = useGalaxyStore((state) => state.config);
  const setConfig = useGalaxyStore((state) => state.setConfig);
  const setFullConfig = useGalaxyStore((state) => state.setFullConfig);
  const resetConfig = useGalaxyStore((state) => state.resetConfig);

  const handleScreenshot = () => {
    if (gl) {
      takeScreenshot(gl);
    }
  };

  const handleExport = () => {
    exportConfig(config);
  };

  const handleImport = () => {
    importConfig((newConfig) => {
      setFullConfig(newConfig);
    });
  };

  return (
    <div className="fixed right-4 top-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto
                    bg-gray-900/90 backdrop-blur-xl border border-cyan-500/30 
                    rounded-2xl shadow-2xl shadow-cyan-500/10 p-5 z-50">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-transparent bg-clip-text 
                       bg-gradient-to-r from-cyan-400 to-blue-400 
                       tracking-wider mb-1">
          GALAXY LAB
        </h1>
        <p className="text-xs text-gray-400">3D 粒子星系可视化工具</p>
      </div>

      <div className="mb-6 p-3 bg-gray-800/50 rounded-xl border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-cyan-300 font-medium">粒子数量</span>
        </div>
        <p className="text-2xl font-mono text-white font-bold">
          {config.particleCount.toLocaleString()}
        </p>
      </div>

      <div className="mb-5">
        <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">
          星系参数
        </h2>

        <div className="mb-4">
          <label className="text-xs text-cyan-300 font-medium tracking-wide block mb-2">
            旋臂数量
          </label>
          <div className="flex gap-2">
            {([2, 3, 4] as const).map((count) => (
              <button
                key={count}
                onClick={() => setConfig('armCount', count)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                           ${config.armCount === count
                             ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                             : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                           }`}
              >
                {count} 臂
              </button>
            ))}
          </div>
        </div>

        <Slider
          label="粒子总数"
          value={config.particleCount}
          min={CONFIG_RANGES.particleCount.min}
          max={CONFIG_RANGES.particleCount.max}
          step={CONFIG_RANGES.particleCount.step}
          onChange={(v) => setConfig('particleCount', v)}
          formatValue={(v) => v.toLocaleString()}
        />

        <Slider
          label="旋转速度"
          value={config.rotationSpeed}
          min={CONFIG_RANGES.rotationSpeed.min}
          max={CONFIG_RANGES.rotationSpeed.max}
          step={CONFIG_RANGES.rotationSpeed.step}
          onChange={(v) => setConfig('rotationSpeed', v)}
          formatValue={(v) => v.toFixed(2)}
        />

        <Slider
          label="旋臂缠绕程度"
          value={config.armTightness}
          min={CONFIG_RANGES.armTightness.min}
          max={CONFIG_RANGES.armTightness.max}
          step={CONFIG_RANGES.armTightness.step}
          onChange={(v) => setConfig('armTightness', v)}
          formatValue={(v) => v.toFixed(2)}
        />
      </div>

      <div className="mb-5">
        <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">
          显示选项
        </h2>

        <Toggle
          label="背景星空"
          checked={config.showBackground}
          onChange={(v) => setConfig('showBackground', v)}
        />

        <Toggle
          label="粒子大小随机化"
          checked={config.randomSize}
          onChange={(v) => setConfig('randomSize', v)}
        />

        <Toggle
          label="雾化效果"
          checked={config.fogEnabled}
          onChange={(v) => setConfig('fogEnabled', v)}
        />

        <Toggle
          label="相机自动环绕"
          checked={config.autoRotate}
          onChange={(v) => setConfig('autoRotate', v)}
        />
      </div>

      <div className="mb-5">
        <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">
          操作
        </h2>

        <div className="space-y-2">
          <Button onClick={handleScreenshot} variant="primary">
            <span className="flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" />
              截图保存 PNG
            </span>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleExport} variant="secondary">
              <span className="flex items-center justify-center gap-1">
                <Download className="w-3 h-3" />
                导出配置
              </span>
            </Button>
            <Button onClick={handleImport} variant="secondary">
              <span className="flex items-center justify-center gap-1">
                <Upload className="w-3 h-3" />
                导入配置
              </span>
            </Button>
          </div>

          <Button onClick={resetConfig} variant="secondary">
            <span className="flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" />
              重置为默认
            </span>
          </Button>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center pt-3 border-t border-gray-800">
        <p>拖拽旋转视角 · 滚轮缩放 · 点击星系查看参数</p>
      </div>
    </div>
  );
}
