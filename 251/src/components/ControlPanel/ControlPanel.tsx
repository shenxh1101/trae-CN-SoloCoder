import { useState, useRef } from 'react';
import * as THREE from 'three';
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  Palette,
  Sparkles,
  Move,
  Camera,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Camera as CameraIcon,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import { useConfig, useSceneActions, useCameraMode } from '../../store/useSceneStore';
import { VisualStyle, BackgroundType, StairConfig } from '../../types';
import { generateRandomSeed } from '../../core/SeedRandom';
import { takeScreenshot, debugScreenshot } from '../../utils/screenshot';
import { exportConfig, importConfigFromFile } from '../../utils/configIO';

interface ComposerType {
  render: () => void;
}

interface ControlPanelProps {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  composer: ComposerType | null;
}

export function ControlPanel({ renderer, scene, camera, composer }: ControlPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'movement' | 'export'>('visual');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = useConfig();
  const actions = useSceneActions();
  const cameraMode = useCameraMode();

  const handleConfigChange = (updates: Partial<StairConfig>) => {
    actions.setConfig(updates);
  };

  const handleRandomSeed = () => {
    const newSeed = generateRandomSeed();
    handleConfigChange({ seed: newSeed });
  };

  const handleScreenshot = () => {
    if (renderer && scene && camera) {
      console.log('🖼️  正在截取屏幕...');
      debugScreenshot(renderer, scene, camera);
      console.log('  - Composer 存在:', !!composer);
      takeScreenshot(renderer, scene, camera, composer);
    }
  };

  const handleExportConfig = () => {
    exportConfig(config);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importConfigFromFile(file)
        .then((importedConfig) => {
          actions.setConfig(importedConfig);
        })
        .catch((error) => {
          alert('导入配置失败: ' + error.message);
        });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置所有设置吗？')) {
      actions.resetConfig();
      actions.resetStats();
    }
  };

  const styles: { value: VisualStyle; label: string; icon: string }[] = [
    { value: 'neon', label: '霓虹', icon: '✨' },
    { value: 'stone', label: '石质', icon: '🪨' },
    { value: 'glass', label: '琉璃', icon: '💎' },
  ];

  const backgrounds: { value: BackgroundType; label: string; icon: string }[] = [
    { value: 'starfield', label: '星空', icon: '🌟' },
    { value: 'abyss', label: '深渊', icon: '🕳️' },
  ];

  const tabs = [
    { id: 'visual', label: '视觉', icon: Palette },
    { id: 'movement', label: '移动', icon: Move },
    { id: 'export', label: '导出', icon: Download },
  ] as const;

  return (
    <div
      className={`absolute top-4 right-4 z-10 transition-all duration-300 ${
        collapsed ? 'translate-x-[calc(100%-48px)]' : 'translate-x-0'
      }`}
    >
      <div className="flex">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-12 w-12 flex items-center justify-center bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-l-lg text-cyan-400 hover:bg-black/80 transition-colors"
        >
          {collapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-r-lg w-80 overflow-hidden shadow-lg shadow-cyan-500/10">
          <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-cyan-400" />
              <span className="text-cyan-400 font-mono font-bold tracking-wider">
                控制面板
              </span>
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
              title="重置设置"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex border-b border-gray-700/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-mono transition-colors ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/10'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {activeTab === 'visual' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-gray-300 text-xs font-mono mb-2">
                    视觉风格
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {styles.map((style) => (
                      <button
                        key={style.value}
                        onClick={() => handleConfigChange({ style: style.value })}
                        className={`p-2 rounded border text-xs font-mono flex flex-col items-center gap-1 transition-all ${
                          config.style === style.value
                            ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400'
                            : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-lg">{style.icon}</span>
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-mono mb-2">
                    背景
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {backgrounds.map((bg) => (
                      <button
                        key={bg.value}
                        onClick={() => handleConfigChange({ background: bg.value })}
                        className={`p-2 rounded border text-xs font-mono flex items-center justify-center gap-2 transition-all ${
                          config.background === bg.value
                            ? 'border-purple-400 bg-purple-400/20 text-purple-400'
                            : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-lg">{bg.icon}</span>
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-mono mb-2">
                    种子
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.seed}
                      onChange={(e) => handleConfigChange({ seed: e.target.value })}
                      className="flex-1 bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={handleRandomSeed}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                      title="随机种子"
                    >
                      <Shuffle size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 text-xs font-mono mb-2">
                      阶梯颜色
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.stairColor}
                        onChange={(e) => handleConfigChange({ stairColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={config.stairColor}
                        onChange={(e) => handleConfigChange({ stairColor: e.target.value })}
                        className="flex-1 bg-gray-900/50 border border-gray-700 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-xs font-mono mb-2">
                      强调色
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.accentColor}
                        onChange={(e) => handleConfigChange({ accentColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={config.accentColor}
                        onChange={(e) => handleConfigChange({ accentColor: e.target.value })}
                        className="flex-1 bg-gray-900/50 border border-gray-700 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-mono mb-2">
                    阶梯尺寸
                  </label>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 font-mono">宽度</span>
                        <span className="text-cyan-400 font-mono">{config.stepWidth.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.1"
                        value={config.stepWidth}
                        onChange={(e) => handleConfigChange({ stepWidth: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 font-mono">高度</span>
                        <span className="text-cyan-400 font-mono">{config.stepHeight.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.05"
                        value={config.stepHeight}
                        onChange={(e) => handleConfigChange({ stepHeight: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 font-mono">深度</span>
                        <span className="text-cyan-400 font-mono">{config.stepDepth.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="5"
                        step="0.1"
                        value={config.stepDepth}
                        onChange={(e) => handleConfigChange({ stepDepth: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-gray-300 text-xs font-mono">
                      螺旋阶梯
                    </label>
                    <button
                      onClick={() => handleConfigChange({ spiral: !config.spiral })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        config.spiral ? 'bg-cyan-500' : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          config.spiral ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {config.spiral && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 font-mono">螺旋角度</span>
                        <span className="text-cyan-400 font-mono">{config.spiralAngle.toFixed(0)}°</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="45"
                        step="1"
                        value={config.spiralAngle}
                        onChange={(e) => handleConfigChange({ spiralAngle: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-purple-400" />
                      <label className="text-gray-300 text-xs font-mono">
                        悬浮粒子
                      </label>
                    </div>
                    <button
                      onClick={() => handleConfigChange({ particleEnabled: !config.particleEnabled })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        config.particleEnabled ? 'bg-purple-500' : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          config.particleEnabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {config.particleEnabled && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 font-mono">粒子数量</span>
                        <span className="text-purple-400 font-mono">{config.particleCount}</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        step="10"
                        value={config.particleCount}
                        onChange={(e) => handleConfigChange({ particleCount: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'movement' && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Move size={14} className="text-green-400" />
                      <label className="text-gray-300 text-xs font-mono">
                        自动行走
                      </label>
                    </div>
                    <button
                      onClick={() => handleConfigChange({ autoWalk: !config.autoWalk })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        config.autoWalk ? 'bg-green-500' : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          config.autoWalk ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {config.autoWalk && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 font-mono">行走速度</span>
                        <span className="text-green-400 font-mono">{config.autoWalkSpeed.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={config.autoWalkSpeed}
                        onChange={(e) => handleConfigChange({ autoWalkSpeed: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Camera size={14} className="text-blue-400" />
                      <label className="text-gray-300 text-xs font-mono">
                        相机模式
                      </label>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => actions.setCameraMode('firstPerson')}
                        className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                          cameraMode === 'firstPerson'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        第一人称
                      </button>
                      <button
                        onClick={() => actions.setCameraMode('thirdPerson')}
                        className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                          cameraMode === 'thirdPerson'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        第三人称
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {config.soundEnabled ? (
                        <Volume2 size={14} className="text-yellow-400" />
                      ) : (
                        <VolumeX size={14} className="text-gray-500" />
                      )}
                      <label className="text-gray-300 text-xs font-mono">
                        脚步声
                      </label>
                    </div>
                    <button
                      onClick={() => handleConfigChange({ soundEnabled: !config.soundEnabled })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        config.soundEnabled ? 'bg-yellow-500' : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          config.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {config.soundEnabled && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 font-mono">音量</span>
                        <span className="text-yellow-400 font-mono">{Math.round(config.soundVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={config.soundVolume}
                        onChange={(e) => handleConfigChange({ soundVolume: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleScreenshot}
                    disabled={!renderer || !scene || !camera}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-600 text-white text-sm font-mono rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <CameraIcon size={16} />
                    保存截图
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-gray-300 text-xs font-mono mb-2">
                    导出配置
                  </label>
                  <p className="text-gray-500 text-xs mb-3">
                    将当前所有设置导出为JSON文件，可分享或以后导入。
                  </p>
                  <button
                    onClick={handleExportConfig}
                    className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white text-sm font-mono rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <Download size={16} />
                    导出 JSON
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-700/50">
                  <label className="block text-gray-300 text-xs font-mono mb-2">
                    导入配置
                  </label>
                  <p className="text-gray-500 text-xs mb-3">
                    从JSON文件加载之前保存的配置。
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportConfig}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-sm font-mono rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <Upload size={16} />
                    导入 JSON
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-700/50">
                  <label className="block text-gray-300 text-xs font-mono mb-2">
                    当前配置预览
                  </label>
                  <div className="bg-gray-900/50 border border-gray-700 rounded p-3 max-h-60 overflow-auto">
                    <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
                      {JSON.stringify(config, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
