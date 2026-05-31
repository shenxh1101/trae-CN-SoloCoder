import { TreePine, Wind, Camera, Hand, SlidersHorizontal, Lock, Unlock, RotateCw, CameraIcon, Download } from 'lucide-react'
import { useTreeStore } from '@/store'
import type { TreePreset, BreathMode, LockablePart } from '@/types'

interface ControlPanelProps {
  onScreenshot: () => void
  onExport: () => void
}

const PRESET_OPTIONS: { value: TreePreset; label: string }[] = [
  { value: 'oak', label: '橡树 Oak' },
  { value: 'willow', label: '柳树 Willow' },
  { value: 'cherry', label: '樱花 Cherry' },
]

const BREATH_OPTIONS: { value: BreathMode; label: string; icon: React.ReactNode }[] = [
  { value: 'camera', label: '摄像头', icon: <Camera size={14} /> },
  { value: 'manual', label: '手动', icon: <Hand size={14} /> },
  { value: 'slider', label: '滑块', icon: <SlidersHorizontal size={14} /> },
]

const LOCK_OPTIONS: { value: LockablePart; label: string }[] = [
  { value: 'trunk', label: '树干' },
  { value: 'branches', label: '分支' },
  { value: 'leaves', label: '树叶' },
]

export default function ControlPanel({ onScreenshot, onExport }: ControlPanelProps) {
  const treePreset = useTreeStore((s) => s.treePreset)
  const breathMode = useTreeStore((s) => s.breathMode)
  const windStrength = useTreeStore((s) => s.windStrength)
  const lockedParts = useTreeStore((s) => s.lockedParts)
  const autoRotate = useTreeStore((s) => s.autoRotate)
  const setTreePreset = useTreeStore((s) => s.setTreePreset)
  const setBreathMode = useTreeStore((s) => s.setBreathMode)
  const setWindStrength = useTreeStore((s) => s.setWindStrength)
  const toggleLockedPart = useTreeStore((s) => s.toggleLockedPart)
  const setAutoRotate = useTreeStore((s) => s.setAutoRotate)

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex flex-col gap-5 w-56">
      <div className="flex flex-col gap-2">
        <label className="text-xs text-white/80 flex items-center gap-1.5">
          <TreePine size={14} />
          Tree Preset
        </label>
        <div className="flex gap-1.5">
          {PRESET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTreePreset(opt.value)}
              className={`flex-1 text-xs px-2 py-1.5 rounded-lg transition ${
                treePreset === opt.value
                  ? 'bg-emerald-500/30 border border-emerald-400/50 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white/70 border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-white/80 flex items-center gap-1.5">
          <Wind size={14} />
          Breath Mode
        </label>
        <div className="flex gap-1.5">
          {BREATH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBreathMode(opt.value)}
              className={`flex-1 text-xs px-2 py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                breathMode === opt.value
                  ? 'bg-emerald-500/30 border border-emerald-400/50 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white/70 border border-transparent'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-white/80 flex items-center gap-1.5">
          <Wind size={14} />
          Wind Strength
          <span className="ml-auto text-white/60">{Math.round(windStrength * 100)}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(windStrength * 100)}
          onChange={(e) => setWindStrength(Number(e.target.value) / 100)}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-emerald-400"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-white/80 flex items-center gap-1.5">
          <Lock size={14} />
          Lock Controls
        </label>
        <div className="flex flex-col gap-1.5">
          {LOCK_OPTIONS.map((opt) => {
            const isLocked = lockedParts.includes(opt.value)
            return (
              <div key={opt.value} className="flex items-center justify-between">
                <span className="text-xs text-white/70">{opt.label}</span>
                <button
                  onClick={() => toggleLockedPart(opt.value)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    isLocked ? 'bg-emerald-500/40' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform flex items-center justify-center ${
                      isLocked
                        ? 'translate-x-4 bg-emerald-400'
                        : 'translate-x-0 bg-white/40'
                    }`}
                  >
                    {isLocked ? <Lock size={8} /> : <Unlock size={8} />}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs text-white/80 flex items-center gap-1.5">
          <RotateCw size={14} />
          Auto Rotate
        </label>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            autoRotate ? 'bg-emerald-500/40' : 'bg-white/10'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
              autoRotate ? 'translate-x-4 bg-emerald-400' : 'translate-x-0 bg-white/40'
            }`}
          />
        </button>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={onScreenshot}
          className="flex-1 text-xs px-2 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white/80 flex items-center justify-center gap-1.5"
        >
          <CameraIcon size={14} />
          Screenshot
        </button>
        <button
          onClick={onExport}
          className="flex-1 text-xs px-2 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white/80 flex items-center justify-center gap-1.5"
        >
          <Download size={14} />
          Export
        </button>
      </div>
    </div>
  )
}
