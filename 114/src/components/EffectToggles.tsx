import { useKaleidoscopeStore } from '@/store/useKaleidoscopeStore'
import { Copy, Sparkles } from 'lucide-react'

interface ToggleProps {
  label: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  icon: typeof Copy
}

function Toggle({ label, enabled, onChange, icon: Icon }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`flex items-center gap-3 w-full p-3 rounded-lg border transition-all duration-200 ${
        enabled
          ? 'bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-300 shadow-lg shadow-fuchsia-500/20'
          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
      }`}
    >
      <Icon size={18} />
      <span className="text-sm flex-1 text-left">{label}</span>
      <div
        className={`w-10 h-5 rounded-full transition-all duration-200 ${
          enabled ? 'bg-fuchsia-500' : 'bg-white/20'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-all duration-200 ${
            enabled ? 'ml-5' : 'ml-0.5'
          }`}
        />
      </div>
    </button>
  )
}

export function EffectToggles() {
  const config = useKaleidoscopeStore((state) => state.config)
  const setMirrorEffect = useKaleidoscopeStore((state) => state.setMirrorEffect)
  const setParticleMode = useKaleidoscopeStore((state) => state.setParticleMode)

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-fuchsia-300 uppercase tracking-wider">
        视觉效果
      </label>
      <div className="space-y-2">
        <Toggle
          label="镜面反射"
          enabled={config.mirrorEffect}
          onChange={setMirrorEffect}
          icon={Copy}
        />
        <Toggle
          label="粒子叠加"
          enabled={config.particleMode}
          onChange={setParticleMode}
          icon={Sparkles}
        />
      </div>
    </div>
  )
}
