import { useKaleidoscopeStore } from '@/store/useKaleidoscopeStore'
import { RotateCw, Palette, Layers } from 'lucide-react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  icon: typeof RotateCw
}

function Slider({ label, value, min, max, step, onChange, icon: Icon }: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-cyan-400" />
          <label className="text-xs font-medium text-gray-300">{label}</label>
        </div>
        <span className="text-xs text-cyan-300 font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-cyan-400
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-cyan-500/50
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:hover:scale-110"
      />
    </div>
  )
}

export function SliderGroup() {
  const config = useKaleidoscopeStore((state) => state.config)
  const setRotationSpeed = useKaleidoscopeStore((state) => state.setRotationSpeed)
  const setColorSpeed = useKaleidoscopeStore((state) => state.setColorSpeed)
  const setComplexity = useKaleidoscopeStore((state) => state.setComplexity)

  return (
    <div className="space-y-4">
      <Slider
        label="旋转速度"
        value={config.rotationSpeed}
        min={0}
        max={2}
        step={0.01}
        onChange={setRotationSpeed}
        icon={RotateCw}
      />
      <Slider
        label="颜色变化速度"
        value={config.colorSpeed}
        min={0}
        max={2}
        step={0.01}
        onChange={setColorSpeed}
        icon={Palette}
      />
      <Slider
        label="形状复杂度"
        value={config.complexity}
        min={1}
        max={10}
        step={1}
        onChange={setComplexity}
        icon={Layers}
      />
    </div>
  )
}
