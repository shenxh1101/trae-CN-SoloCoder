import { useSolarSystemStore } from '@/store/useSolarSystemStore'
import { Camera, Moon } from 'lucide-react'

export default function CameraModeBadge() {
  const cameraMode = useSolarSystemStore((s) => s.cameraMode)

  return (
    <div className="fixed top-4 right-4 z-10 glass-panel px-4 py-2 flex items-center gap-2">
      {cameraMode === 'global' ? (
        <Camera size={14} className="text-star-blue" />
      ) : (
        <Moon size={14} className="text-orbit-gold" />
      )}
      <span className="text-xs font-orbitron tracking-wider">
        {cameraMode === 'global' ? (
          <span className="text-star-blue">全局视角</span>
        ) : (
          <span className="text-orbit-gold">月球视角</span>
        )}
      </span>
    </div>
  )
}
