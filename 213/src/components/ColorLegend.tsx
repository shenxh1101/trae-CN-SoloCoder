import { useRef, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { mapHeightToColor } from '@/utils/colorMapper'

const BAR_W = 24
const BAR_H = 200

export default function ColorLegend() {
  const colorPalette = useStore((s) => s.colorPalette)
  const curvePoints = useStore((s) => s.curvePoints)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    for (let y = 0; y < BAR_H; y++) {
      const height = 1 - y / (BAR_H - 1)
      const color = mapHeightToColor(height, colorPalette, curvePoints)
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`
      ctx.fillRect(0, y, BAR_W, 1)
    }
  }, [colorPalette, curvePoints])

  return (
    <div className="flex items-start gap-3 p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
      <div>
        <p className="text-xs uppercase tracking-wider text-white/40 mb-2 font-['Orbitron']">颜色映射</p>
        <canvas
          ref={canvasRef}
          width={BAR_W}
          height={BAR_H}
          className="rounded-md border border-white/10"
        />
      </div>
      <div className="flex flex-col justify-between h-[200px] pt-5">
        <span className="text-[10px] text-white/40 font-['Noto_Sans_SC']">1.0</span>
        <span className="text-[10px] text-white/40 font-['Noto_Sans_SC']">0.5</span>
        <span className="text-[10px] text-white/40 font-['Noto_Sans_SC']">0.0</span>
      </div>
    </div>
  )
}
