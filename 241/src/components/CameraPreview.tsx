import { useState } from 'react'
import { useTreeStore } from '@/store'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CameraPreviewProps {
  videoRef: (el: HTMLVideoElement | null) => void
  canvasRef: (el: HTMLCanvasElement | null) => void
}

export default function CameraPreview({ videoRef, canvasRef }: CameraPreviewProps) {
  const breathMode = useTreeStore((s) => s.breathMode)
  const breathValue = useTreeStore((s) => s.breathValue)
  const [isMinimized, setIsMinimized] = useState(false)

  if (breathMode !== 'camera') return null

  return (
    <div className="absolute left-4 bottom-6 z-[60] flex flex-col gap-2">
      <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-white/70">呼吸检测中</span>
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white/50 hover:text-white/80 transition"
          >
            {isMinimized ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        <div className={isMinimized ? 'hidden' : 'relative'} style={{ width: 200, height: 150 }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: 'block',
            }}
          />
          <div
            className="absolute border border-emerald-400/40 rounded pointer-events-none"
            style={{
              left: '20%',
              top: '20%',
              width: '60%',
              height: '60%',
            }}
          >
            <span className="absolute -top-4 left-0 text-[8px] text-emerald-400/60 whitespace-nowrap">
              胸腹检测区
            </span>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="px-3 py-1.5 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50">呼吸值</span>
            <span className="text-[10px] text-emerald-400 font-medium">{Math.round(breathValue * 100)}%</span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-emerald-400/60 rounded-full transition-all duration-200"
              style={{ width: `${breathValue * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
