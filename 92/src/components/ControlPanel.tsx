import { useParticleStore } from '@/store/useParticleStore'
import { Download } from 'lucide-react'

interface ControlPanelProps {
  open: boolean
  onScreenshot: () => void
}

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] text-cyan-300/80 font-barlow font-medium tracking-wider uppercase">{label}</span>
        <span className="text-[11px] text-cyan-400 font-orbitron font-bold">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider-cyan"
      />
    </div>
  )
}

function SelectRow({ label, value, options, onChange }: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="mb-4">
      <span className="text-[11px] text-cyan-300/80 font-barlow font-medium tracking-wider uppercase block mb-1.5">{label}</span>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-2 py-1.5 rounded text-[10px] font-barlow font-semibold tracking-wide transition-all border ${
              value === opt.value
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_8px_rgba(0,255,255,0.15)]'
                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onChange }: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex justify-between items-center mb-4">
      <span className="text-[11px] text-cyan-300/80 font-barlow font-medium tracking-wider uppercase">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
          value ? 'bg-cyan-500/40 shadow-[0_0_12px_rgba(0,255,255,0.2)]' : 'bg-white/10'
        }`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${
          value
            ? 'left-[22px] bg-cyan-400 shadow-[0_0_6px_rgba(0,255,255,0.5)]'
            : 'left-0.5 bg-white/30'
        }`} />
      </button>
    </div>
  )
}

const selParticleCount = (s: ReturnType<typeof useParticleStore.getState>) => s.particleCount
const selParticleSize = (s: ReturnType<typeof useParticleStore.getState>) => s.particleSize
const selSphereRadius = (s: ReturnType<typeof useParticleStore.getState>) => s.sphereRadius
const selMotionMode = (s: ReturnType<typeof useParticleStore.getState>) => s.motionMode
const selParticleShape = (s: ReturnType<typeof useParticleStore.getState>) => s.particleShape
const selBackground = (s: ReturnType<typeof useParticleStore.getState>) => s.background
const selShowLines = (s: ReturnType<typeof useParticleStore.getState>) => s.showLines
const selAutoRotate = (s: ReturnType<typeof useParticleStore.getState>) => s.autoRotate
const selTrailEffect = (s: ReturnType<typeof useParticleStore.getState>) => s.trailEffect

export default function ControlPanel({ open, onScreenshot }: ControlPanelProps) {
  const particleCount = useParticleStore(selParticleCount)
  const particleSize = useParticleStore(selParticleSize)
  const sphereRadius = useParticleStore(selSphereRadius)
  const motionMode = useParticleStore(selMotionMode)
  const particleShape = useParticleStore(selParticleShape)
  const background = useParticleStore(selBackground)
  const showLines = useParticleStore(selShowLines)
  const autoRotate = useParticleStore(selAutoRotate)
  const trailEffect = useParticleStore(selTrailEffect)
  const setParticleCount = useParticleStore((s) => s.setParticleCount)
  const setParticleSize = useParticleStore((s) => s.setParticleSize)
  const setSphereRadius = useParticleStore((s) => s.setSphereRadius)
  const setMotionMode = useParticleStore((s) => s.setMotionMode)
  const setParticleShape = useParticleStore((s) => s.setParticleShape)
  const setBackground = useParticleStore((s) => s.setBackground)
  const setShowLines = useParticleStore((s) => s.setShowLines)
  const setAutoRotate = useParticleStore((s) => s.setAutoRotate)
  const setTrailEffect = useParticleStore((s) => s.setTrailEffect)

  return (
    <div className={`absolute top-0 right-0 h-full z-10 transition-transform duration-500 ease-out ${
      open ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="h-full w-72 p-5 pt-6 overflow-y-auto custom-scrollbar"
        style={{
          background: 'linear-gradient(180deg, rgba(5,10,30,0.88) 0%, rgba(2,5,20,0.92) 100%)',
          backdropFilter: 'blur(20px) saturate(1.5)',
          borderLeft: '1px solid rgba(0,255,255,0.08)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        <div className="mb-6">
          <h2 className="font-orbitron text-sm font-bold text-cyan-300 tracking-[0.2em] mb-1">PARTICLE SPHERE</h2>
          <div className="h-px bg-gradient-to-r from-cyan-500/40 via-cyan-400/20 to-transparent" />
        </div>

        <div className="mb-5">
          <h3 className="text-[10px] text-cyan-500/60 font-orbitron tracking-[0.3em] mb-3">PARAMETERS</h3>
          <SliderRow
            label="Particle Count"
            value={particleCount}
            min={1000}
            max={10000}
            step={100}
            onChange={setParticleCount}
          />
          <SliderRow
            label="Particle Size"
            value={particleSize}
            min={0.5}
            max={10}
            step={0.5}
            onChange={setParticleSize}
          />
          <SliderRow
            label="Sphere Radius"
            value={sphereRadius}
            min={1}
            max={12}
            step={0.5}
            onChange={setSphereRadius}
          />
        </div>

        <div className="mb-5">
          <h3 className="text-[10px] text-cyan-500/60 font-orbitron tracking-[0.3em] mb-3">MOTION</h3>
          <SelectRow
            label="Motion Mode"
            value={motionMode}
            options={[
              { value: 'static', label: 'Static' },
              { value: 'rotateY', label: 'Y-Axis' },
              { value: 'rotateXY', label: 'XY-Axis' },
            ]}
            onChange={(v) => setMotionMode(v as 'static' | 'rotateY' | 'rotateXY')}
          />
        </div>

        <div className="mb-5">
          <h3 className="text-[10px] text-cyan-500/60 font-orbitron tracking-[0.3em] mb-3">APPEARANCE</h3>
          <SelectRow
            label="Particle Shape"
            value={particleShape}
            options={[
              { value: 'sphere', label: 'Sphere' },
              { value: 'cube', label: 'Cube' },
              { value: 'star', label: 'Star' },
            ]}
            onChange={(v) => setParticleShape(v as 'sphere' | 'cube' | 'star')}
          />
          <SelectRow
            label="Background"
            value={background}
            options={[
              { value: 'black', label: 'Black' },
              { value: 'white', label: 'White' },
              { value: 'starfield', label: 'Stars' },
            ]}
            onChange={(v) => setBackground(v as 'black' | 'white' | 'starfield')}
          />
        </div>

        <div className="mb-5">
          <h3 className="text-[10px] text-cyan-500/60 font-orbitron tracking-[0.3em] mb-3">EFFECTS</h3>
          <ToggleRow label="Line Connections" value={showLines} onChange={setShowLines} />
          <ToggleRow label="Auto Rotate Camera" value={autoRotate} onChange={setAutoRotate} />
          <ToggleRow label="Trail Effect" value={trailEffect} onChange={setTrailEffect} />
        </div>

        <div className="mt-6">
          <button
            onClick={onScreenshot}
            className="w-full py-3 rounded-lg font-barlow font-semibold text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-2 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)]"
            style={{ background: 'linear-gradient(135deg, rgba(0,255,255,0.05), rgba(0,100,255,0.05))' }}
          >
            <Download size={16} />
            <span>SAVE SCREENSHOT</span>
          </button>
        </div>
      </div>
    </div>
  )
}
