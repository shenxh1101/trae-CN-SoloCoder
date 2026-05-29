import { useState } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Wind,
  Snowflake,
  Camera,
  RefreshCw,
  X,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function ControlPanel() {
  const [isOpen, setIsOpen] = useState(true);

  const snowflakeCount = useStore((s) => s.snowflakeCount);
  const snowfallSpeed = useStore((s) => s.snowfallSpeed);
  const isNight = useStore((s) => s.isNight);
  const fogDensity = useStore((s) => s.fogDensity);
  const windStrength = useStore((s) => s.windStrength);
  const isAutoOrbit = useStore((s) => s.isAutoOrbit);

  const setSnowflakeCount = useStore((s) => s.setSnowflakeCount);
  const setSnowfallSpeed = useStore((s) => s.setSnowfallSpeed);
  const setIsNight = useStore((s) => s.setIsNight);
  const setFogDensity = useStore((s) => s.setFogDensity);
  const setWindStrength = useStore((s) => s.setWindStrength);
  const setIsAutoOrbit = useStore((s) => s.setIsAutoOrbit);
  const toggleNight = useStore((s) => s.toggleNight);
  const toggleAutoOrbit = useStore((s) => s.toggleAutoOrbit);

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `snowy-village-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="open-panel"
        className="fixed top-4 left-4 z-50 bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all duration-300 p-3 rounded-xl border border-white/30 shadow-lg"
      >
        <Settings className="w-5 h-5 text-white" />
      </button>

      {isOpen && (
        <div className="fixed top-4 left-16 z-50 bg-gray-900/80 backdrop-blur-lg rounded-2xl p-5 w-80 border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-bold text-lg">控制面板</h2>
            <button
              onClick={() => setIsOpen(false)}
              data-testid="close-panel"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                {isNight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <span>白天/夜晚</span>
              </div>
              <button
                onClick={toggleNight}
                data-testid="night-toggle"
                className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${
                  isNight ? 'bg-blue-600' : 'bg-yellow-500'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                    isNight ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 text-white mb-2">
                <Snowflake className="w-5 h-5" />
                <span>雪花数量</span>
                <span className="ml-auto text-sm text-gray-400">{snowflakeCount}</span>
              </div>
              <input
                type="range"
                data-testid="snowflake-count-slider"
                min="100"
                max="2000"
                value={snowflakeCount}
                onChange={(e) => setSnowflakeCount(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 text-white mb-2">
                <Snowflake className="w-5 h-5" />
                <span>下落速度</span>
                <span className="ml-auto text-sm text-gray-400">{snowfallSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                data-testid="snowfall-speed-slider"
                min="0.1"
                max="3"
                step="0.1"
                value={snowfallSpeed}
                onChange={(e) => setSnowfallSpeed(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 text-white mb-2">
                <Wind className="w-5 h-5" />
                <span>风向风力</span>
                <span className="ml-auto text-sm text-gray-400">
                  {windStrength > 0 ? `右 ${windStrength.toFixed(1)}` : windStrength < 0 ? `左 ${Math.abs(windStrength).toFixed(1)}` : '无风'}
                </span>
              </div>
              <input
                type="range"
                data-testid="wind-slider"
                min="-5"
                max="5"
                step="0.5"
                value={windStrength}
                onChange={(e) => setWindStrength(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 text-white mb-2">
                <span className="text-lg">🌫️</span>
                <span>雾浓度</span>
                <span className="ml-auto text-sm text-gray-400">{(fogDensity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                data-testid="fog-slider"
                min="0"
                max="0.1"
                step="0.005"
                value={fogDensity}
                onChange={(e) => setFogDensity(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <RefreshCw className="w-5 h-5" />
                <span>自动环绕</span>
              </div>
              <button
                onClick={toggleAutoOrbit}
                data-testid="auto-orbit-toggle"
                className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${
                  isAutoOrbit ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                    isAutoOrbit ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleScreenshot}
              data-testid="screenshot-btn"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Camera className="w-5 h-5" />
              截图保存
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm text-center">
              💡 点击雪人可以让它挥手哦！
            </p>
          </div>
        </div>
      )}
    </>
  );
}
