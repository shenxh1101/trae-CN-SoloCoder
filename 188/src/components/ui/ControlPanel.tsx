import { useCrystalBallStore, COLOR_MAP, type CrystalColor } from '@/store/crystalBallStore'
import {
  Camera,
  Download,
  Upload,
  Volume2,
  VolumeX,
  Image,
  Sparkles,
  RotateCcw,
  Eye,
  EyeOff,
  Palette,
  SlidersHorizontal,
} from 'lucide-react'
import { useRef, useState, useCallback } from 'react'

export function ControlPanel() {
  const {
    transparency,
    ringSpeed,
    glowIntensity,
    crystalColor,
    reflectionEnabled,
    backgroundMode,
    autoRotate,
    isMuted,
    setTransparency,
    setRingSpeed,
    setGlowIntensity,
    setCrystalColor,
    toggleReflection,
    toggleBackground,
    toggleAutoRotate,
    toggleMute,
    exportConfig,
    importConfig,
  } = useCrystalBallStore()

  const [collapsed, setCollapsed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `crystal-ball-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  const handleExport = useCallback(() => {
    const json = exportConfig()
    const blob = new Blob([json], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = `crystal-ball-config-${Date.now()}.json`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }, [exportConfig])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        importConfig(text)
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [importConfig]
  )

  const colors: { key: CrystalColor; label: string }[] = [
    { key: 'red', label: '红' },
    { key: 'blue', label: '蓝' },
    { key: 'green', label: '绿' },
    { key: 'purple', label: '紫' },
  ]

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed left-4 top-4 z-50 p-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
      >
        <SlidersHorizontal size={20} />
      </button>
    )
  }

  return (
    <div className="fixed left-4 top-4 z-50 w-72 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h2 className="text-sm font-semibold tracking-wider uppercase text-white/80"
          style={{ fontFamily: "'Orbitron', sans-serif" }}>
          水晶球控制台
        </h2>
        <button
          onClick={() => setCollapsed(true)}
          className="text-white/40 hover:text-white/80 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="px-5 py-4 space-y-5 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin">
        <SliderControl
          label="透明度"
          value={transparency}
          min={0}
          max={1}
          step={0.01}
          onChange={setTransparency}
          icon={<Eye size={14} />}
        />

        <SliderControl
          label="光环速度"
          value={ringSpeed}
          min={0}
          max={5}
          step={0.1}
          onChange={setRingSpeed}
          icon={<Sparkles size={14} />}
        />

        <SliderControl
          label="发光强度"
          value={glowIntensity}
          min={0.1}
          max={5}
          step={0.1}
          onChange={setGlowIntensity}
          icon={<Camera size={14} />}
        />

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            <Palette size={14} />
            晶体颜色
          </div>
          <div className="flex gap-2">
            {colors.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCrystalColor(key)}
                className={`relative w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  crystalColor === key
                    ? 'border-white scale-110 shadow-lg'
                    : 'border-white/20 hover:border-white/40'
                }`}
                style={{
                  backgroundColor: COLOR_MAP[key],
                  boxShadow:
                    crystalColor === key
                      ? `0 0 20px ${COLOR_MAP[key]}80`
                      : 'none',
                }}
                title={label}
              >
                {crystalColor === key && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <ToggleControl
            label="地面倒影"
            enabled={reflectionEnabled}
            onToggle={toggleReflection}
            iconOn={<Eye size={14} />}
            iconOff={<EyeOff size={14} />}
          />
          <ToggleControl
            label="自动旋转"
            enabled={autoRotate}
            onToggle={toggleAutoRotate}
            iconOn={<RotateCcw size={14} />}
            iconOff={<RotateCcw size={14} />}
          />
          <ToggleControl
            label="背景模式"
            enabled={backgroundMode === 'starry'}
            onToggle={toggleBackground}
            iconOn={<Sparkles size={14} />}
            iconOff={<Sparkles size={14} />}
            labelOn="星空"
            labelOff="深蓝"
          />
        </div>

        <div className="border-t border-white/5 pt-4 space-y-2">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-3"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            工具
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton icon={<Image size={16} />} label="截图" onClick={handleScreenshot} />
            <ActionButton
              icon={isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              label={isMuted ? '静音' : '播放'}
              onClick={toggleMute}
            />
            <ActionButton icon={<Download size={16} />} label="导出" onClick={handleExport} />
            <ActionButton icon={<Upload size={16} />} label="导入" onClick={handleImport} />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="text-center pt-2">
          <p className="text-[10px] text-white/20"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            点击水晶球触发脉冲
          </p>
        </div>
      </div>
    </div>
  )
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  icon,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  icon: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider"
          style={{ fontFamily: "'Orbitron', sans-serif" }}>
          {icon}
          {label}
        </div>
        <span className="text-xs text-white/60 tabular-nums"
          style={{ fontFamily: "'Exo 2', sans-serif" }}>
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-white/10 accent-blue-400
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-blue-400
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-blue-400/50
          [&::-webkit-slider-thumb]:border-0
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  )
}

function ToggleControl({
  label,
  enabled,
  onToggle,
  iconOn,
  iconOff,
  labelOn,
  labelOff,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
  iconOn: React.ReactNode
  iconOff: React.ReactNode
  labelOn?: string
  labelOff?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider"
        style={{ fontFamily: "'Orbitron', sans-serif" }}>
        {enabled ? iconOn : iconOff}
        {label}
      </div>
      <button
        onClick={onToggle}
        className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
          enabled ? 'bg-blue-500/60' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${
            enabled ? 'left-5 bg-blue-300 shadow-lg shadow-blue-400/50' : 'left-0.5 bg-white/40'
          }`}
        />
      </button>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all duration-200 text-xs"
      style={{ fontFamily: "'Exo 2', sans-serif" }}
    >
      {icon}
      {label}
    </button>
  )
}
