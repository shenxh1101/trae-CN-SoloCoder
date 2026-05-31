import { Settings, Waves, Sparkles, Sun, RotateCcw } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function ControlPanel() {
  const {
    fluidParams,
    envSettings,
    setFlowSpeed,
    setSmoothness,
    setMode,
    setAmplitude,
    setHueSpeed,
    setBackground,
    setAmbientLight,
    setPointLight,
    setAutoRotate,
  } = useStore();

  return (
    <div className="absolute right-4 top-4 w-72 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          <h2 className="text-white font-semibold text-lg">控制面板</h2>
        </div>
      </div>

      <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="space-y-4">
          <h3 className="text-cyan-400 text-sm font-medium flex items-center gap-2">
            <Waves className="w-4 h-4" />
            流体参数
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">流动性</span>
              <span className="text-white font-mono">{fluidParams.flowSpeed}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={fluidParams.flowSpeed}
              onChange={(e) => setFlowSpeed(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">光滑度</span>
              <span className="text-white font-mono">{fluidParams.smoothness}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={fluidParams.smoothness}
              onChange={(e) => setSmoothness(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">变形幅度</span>
              <span className="text-white font-mono">{fluidParams.amplitude.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={fluidParams.amplitude}
              onChange={(e) => setAmplitude(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">色相速度</span>
              <span className="text-white font-mono">{fluidParams.hueSpeed.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={fluidParams.hueSpeed}
              onChange={(e) => setHueSpeed(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div className="space-y-2">
            <span className="text-xs text-gray-400">变形模式</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('turbulence')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  fluidParams.mode === 'turbulence'
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50'
                }`}
              >
                🌊 湍流
              </button>
              <button
                onClick={() => setMode('breathing')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  fluidParams.mode === 'breathing'
                    ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50'
                }`}
              >
                💨 呼吸
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-pink-400 text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            环境设置
          </h3>

          <div className="space-y-2">
            <span className="text-xs text-gray-400">背景模式</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBackground('solid')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  envSettings.background === 'solid'
                    ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50'
                }`}
              >
                纯色
              </button>
              <button
                onClick={() => setBackground('mirror')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  envSettings.background === 'mirror'
                    ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50'
                }`}
              >
                镜面
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 flex items-center gap-2">
              <Sun className="w-4 h-4" /> 环境光
            </span>
            <button
              onClick={() => setAmbientLight(!envSettings.ambientLight)}
              className={`w-12 h-6 rounded-full transition-all ${
                envSettings.ambientLight ? 'bg-cyan-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  envSettings.ambientLight ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> 点光源
            </span>
            <button
              onClick={() => setPointLight(!envSettings.pointLight)}
              className={`w-12 h-6 rounded-full transition-all ${
                envSettings.pointLight ? 'bg-pink-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  envSettings.pointLight ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> 自动环绕
            </span>
            <button
              onClick={() => setAutoRotate(!envSettings.autoRotate)}
              className={`w-12 h-6 rounded-full transition-all ${
                envSettings.autoRotate ? 'bg-purple-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  envSettings.autoRotate ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4, #8b5cf6);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4, #8b5cf6);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }
      `}</style>
    </div>
  );
}
