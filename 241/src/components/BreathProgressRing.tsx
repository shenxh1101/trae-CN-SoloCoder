import { useTreeStore } from '@/store'

export default function BreathProgressRing() {
  const breathValue = useTreeStore((s) => s.breathValue)

  const size = 120
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - breathValue)
  const percentage = Math.round(breathValue * 100)

  return (
    <div className="absolute bottom-6 right-6 z-50 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 p-3 flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="breath-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#breath-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-white/90">{percentage}%</span>
        <span className="text-[10px] text-white/50">Breath</span>
      </div>
    </div>
  )
}
