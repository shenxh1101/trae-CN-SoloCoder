import React, { useState } from 'react'
import {
  Settings,
  Palette,
  Image,
  Sparkles,
  Volume2,
  VolumeX,
  Camera,
  Download,
  RotateCcw,
  Maximize2,
  Sun
} from 'lucide-react'
import { useMagicCircleStore, colorThemes, backgrounds, ColorTheme, Background } from '@/store/magicCircleStore'

interface ControlPanelProps {
  onScreenshot: () => void
}

export default function ControlPanel({ onScreenshot }: ControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const {
    rotationSpeed,
    glowIntensity,
    runeFontSize,
    colorTheme,
    background,
    particleBeamEnabled,
    soundEnabled,
    autoRotateCamera,
    setRotationSpeed,
    setGlowIntensity,
    setRuneFontSize,
    setColorTheme,
    setBackground,
    setParticleBeamEnabled,
    setSoundEnabled,
    setAutoRotateCamera,
    exportConfig
  } = useMagicCircleStore()

  const handleExportConfig = () => {
    const config = exportConfig()
    const blob = new Blob([config], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'magic-circle-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`fixed right-4 top-4 transition-all duration-300 z-50 ${isExpanded ? 'w-80' : 'w-12'}`}>
      <div className="bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            {isExpanded && <span className="text-white font-medium">魔法阵控制</span>}
          </div>
          <Maximize2 className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
        </div>

        {isExpanded && (
          <div className="p-4 space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                参数调节
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>旋转速度</span>
                  <span>{rotationSpeed.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={rotationSpeed}
                  onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>发光强度</span>
                  <span>{glowIntensity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={glowIntensity}
                  onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>符文字体大小</span>
                  <span>{runeFontSize}px</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="64"
                  step="4"
                  value={runeFontSize}
                  onChange={(e) => setRuneFontSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                颜色主题
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(colorThemes) as ColorTheme[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setColorTheme(theme)}
                    className={`p-2 rounded-lg transition-all ${
                      colorTheme === theme 
                        ? 'ring-2 ring-white scale-105' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: colorThemes[theme].primary }}
                    title={colorThemes[theme].name}
                  >
                    <span className="text-xs text-white/80 font-medium">
                      {colorThemes[theme].name.charAt(0)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Image className="w-4 h-4" />
                背景切换
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(backgrounds) as Background[]).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setBackground(bg)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      background === bg
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {backgrounds[bg].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Sun className="w-4 h-4" />
                特效开关
              </h3>
              
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-300">粒子光柱</span>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors ${
                    particleBeamEnabled ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                  onClick={() => setParticleBeamEnabled(!particleBeamEnabled)}
                >
                  <div 
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                      particleBeamEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-300">相机自动环绕</span>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors ${
                    autoRotateCamera ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                  onClick={() => setAutoRotateCamera(!autoRotateCamera)}
                >
                  <div 
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                      autoRotateCamera ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-300 flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  能量嗡鸣声
                </span>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors ${
                    soundEnabled ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  <div 
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </label>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-700">
              <button
                onClick={onScreenshot}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
              >
                <Camera className="w-4 h-4" />
                截图保存PNG
              </button>

              <button
                onClick={handleExportConfig}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
              >
                <Download className="w-4 h-4" />
                导出配置JSON
              </button>

              <button
                onClick={() => {
                  setRotationSpeed(0.5)
                  setGlowIntensity(1.0)
                  setRuneFontSize(32)
                  setColorTheme('blue')
                  setBackground('void')
                  setParticleBeamEnabled(false)
                  setSoundEnabled(false)
                  setAutoRotateCamera(false)
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                重置默认
              </button>
            </div>

            <div className="pt-2 text-center">
              <p className="text-xs text-gray-500">
                点击魔法阵中心触发爆炸特效
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
