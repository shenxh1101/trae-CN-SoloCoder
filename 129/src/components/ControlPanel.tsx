import { useCallback } from 'react'
import {
  Camera, CameraOff, Volume2, VolumeX, Music,
  Sparkles, Download, RotateCcw, Palette,
  Mountain, Zap, ZapOff, Eye, MicOff,
} from 'lucide-react'
import { useMeteorStore, BackgroundType, MeteorColorType } from '@/store/useMeteorStore'
import { startBackgroundMusic, stopBackgroundMusic } from '@/utils/audioManager'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  icon: React.ReactNode
}

function Slider({ label, value, min, max, step, onChange, icon }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-xs text-white/70">
          {icon}
          {label}
        </span>
        <span className="text-xs text-white/50 font-mono">{value.toFixed(step < 1 ? 1 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer bg-white/10 accent-blue-400"
      />
    </div>
  )
}

interface ToggleProps {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  iconOn: React.ReactNode
  iconOff: React.ReactNode
}

function Toggle({ label, value, onChange, iconOn, iconOff }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 w-full ${
        value
          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
          : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
      }`}
    >
      {value ? iconOn : iconOff}
      {label}
    </button>
  )
}

export default function ControlPanel() {
  const store = useMeteorStore()

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `meteor-shower-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  const handleMusicToggle = useCallback((v: boolean) => {
    store.setMusicEnabled(v)
    if (v) {
      startBackgroundMusic()
    } else {
      stopBackgroundMusic()
    }
  }, [store])

  const bgOptions: { type: BackgroundType; label: string; color: string }[] = [
    { type: 'deepBlue', label: '深蓝', color: '#0a0a40' },
    { type: 'purple', label: '紫色', color: '#200a40' },
    { type: 'starry', label: '星空', color: '#020210' },
  ]

  const colorOptions: { type: MeteorColorType; label: string; color: string }[] = [
    { type: 'white', label: '白色', color: '#ffffff' },
    { type: 'lightYellow', label: '淡黄', color: '#fff5b0' },
    { type: 'lightBlue', label: '淡蓝', color: '#b0d0ff' },
  ]

  return (
    <div className="absolute top-4 right-4 w-64 max-h-[calc(100vh-32px)] overflow-y-auto
      bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4
      shadow-2xl shadow-black/50"
      style={{ scrollbarWidth: 'none' }}
    >
      <h2 className="text-sm font-light tracking-widest text-white/60 mb-4 text-center uppercase">
        ✦ 流星雨控制台 ✦
      </h2>

      <div className="bg-white/5 rounded-xl p-3 mb-3">
        <div className="flex items-center justify-center gap-2 text-white/80">
          <Eye size={14} />
          <span className="text-xs">当前流星数量</span>
          <span className="text-lg font-mono text-blue-300 font-bold">{store.meteorCount}</span>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <Slider
          label="流星密度"
          value={store.density}
          min={3}
          max={50}
          step={1}
          onChange={store.setDensity}
          icon={<Zap size={12} />}
        />
        <Slider
          label="飞行速度"
          value={store.speed}
          min={0.2}
          max={3.0}
          step={0.1}
          onChange={store.setSpeed}
          icon={<Sparkles size={12} />}
        />
        <Slider
          label="拖尾长度"
          value={store.trailLength}
          min={5}
          max={60}
          step={1}
          onChange={store.setTrailLength}
          icon={<Mountain size={12} />}
        />
      </div>

      <div className="mb-3">
        <span className="flex items-center gap-1.5 text-xs text-white/50 mb-2">
          <Palette size={12} />
          流星颜色
        </span>
        <div className="flex gap-2">
          {colorOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => store.setMeteorColor(opt.type)}
              className={`flex-1 py-1.5 rounded-lg text-xs transition-all duration-200 border ${
                store.meteorColor === opt.type
                  ? 'border-blue-400/50 bg-blue-500/20 text-white/80'
                  : 'border-white/10 bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: opt.color }}
              />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <span className="flex items-center gap-1.5 text-xs text-white/50 mb-2">
          <Camera size={12} />
          背景主题
        </span>
        <div className="flex gap-2">
          {bgOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => store.setBackground(opt.type)}
              className={`flex-1 py-1.5 rounded-lg text-xs transition-all duration-200 border ${
                store.background === opt.type
                  ? 'border-blue-400/50 bg-blue-500/20 text-white/80'
                  : 'border-white/10 bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: opt.color }}
              />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Toggle
          label="闪光"
          value={store.flashEnabled}
          onChange={store.setFlashEnabled}
          iconOn={<Sparkles size={12} />}
          iconOff={<ZapOff size={12} />}
        />
        <Toggle
          label="音乐"
          value={store.musicEnabled}
          onChange={handleMusicToggle}
          iconOn={<Music size={12} />}
          iconOff={<MicOff size={12} />}
        />
        <Toggle
          label="音效"
          value={store.soundEnabled}
          onChange={store.setSoundEnabled}
          iconOn={<Volume2 size={12} />}
          iconOff={<VolumeX size={12} />}
        />
        <Toggle
          label="旋转"
          value={store.autoRotate}
          onChange={store.setAutoRotate}
          iconOn={<RotateCcw size={12} />}
          iconOff={<CameraOff size={12} />}
        />
      </div>

      <button
        onClick={handleScreenshot}
        className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20
          border border-blue-400/20 text-white/70 text-xs flex items-center justify-center gap-2
          hover:from-blue-500/30 hover:to-purple-500/30 hover:text-white/90 transition-all duration-200"
      >
        <Download size={14} />
        截图保存
      </button>
    </div>
  )
}
