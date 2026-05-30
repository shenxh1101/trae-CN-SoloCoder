import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { mapHeightToColor, remapHeight } from '@/utils/colorMapper'
import type { CurvePoint } from '@/utils/colorMapper'

const W = 280
const H = 160
const PAD = 24
const CW = W - PAD * 2
const CH = H - PAD * 2
const POINT_R = 6

function toCanvas(p: CurvePoint) {
  return { cx: PAD + p.x * CW, cy: PAD + (1 - p.y) * CH }
}

function fromCanvas(cx: number, cy: number): CurvePoint {
  return {
    x: Math.max(0, Math.min(1, (cx - PAD) / CW)),
    y: Math.max(0, Math.min(1, 1 - (cy - PAD) / CH)),
  }
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  points: CurvePoint[],
  palette: { r: number; g: number; b: number }[],
  curvePoints: CurvePoint[]
) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0a0e17'
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const x = PAD + (CW * i) / 4
    ctx.beginPath()
    ctx.moveTo(x, PAD)
    ctx.lineTo(x, PAD + CH)
    ctx.stroke()
  }
  for (let i = 0; i <= 4; i++) {
    const y = PAD + (CH * i) / 4
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(PAD + CW, y)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.strokeRect(PAD, PAD, CW, CH)

  const steps = 60
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const remapped = remapHeight(t, points)
    const cx = PAD + t * CW
    const cy = PAD + (1 - remapped) * CH
    if (i === 0) ctx.moveTo(cx, cy)
    else ctx.lineTo(cx, cy)
  }
  ctx.strokeStyle = 'rgba(139,92,246,0.8)'
  ctx.stroke()

  for (let i = 0; i <= steps; i += 2) {
    const t = i / steps
    const color = mapHeightToColor(t, palette, curvePoints)
    const remapped = remapHeight(t, points)
    const cx = PAD + t * CW
    const cy = PAD + (1 - remapped) * CH
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`
    ctx.fill()
  }

  for (const p of points) {
    const { cx, cy } = toCanvas(p)
    ctx.beginPath()
    ctx.arc(cx, cy, POINT_R, 0, Math.PI * 2)
    ctx.fillStyle = '#8b5cf6'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = "10px 'Noto Sans SC'"
  ctx.textAlign = 'center'
  ctx.fillText('高度', PAD + CW / 2, H - 4)
  ctx.save()
  ctx.translate(8, PAD + CH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('映射', 0, 0)
  ctx.restore()
}

export default function CurveEditor() {
  const curvePoints = useStore((s) => s.curvePoints)
  const setCurvePoints = useStore((s) => s.setCurvePoints)
  const colorPalette = useStore((s) => s.colorPalette)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragIdx = useRef<number | null>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawCurve(ctx, curvePoints, colorPalette, curvePoints)
  }, [curvePoints, colorPalette])

  const getPos = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const findPoint = useCallback(
    (x: number, y: number) => {
      for (let i = 0; i < curvePoints.length; i++) {
        const { cx, cy } = toCanvas(curvePoints[i])
        if (Math.hypot(x - cx, y - cy) <= POINT_R + 4) return i
      }
      return -1
    },
    [curvePoints]
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getPos(e)
      const idx = findPoint(pos.x, pos.y)
      if (idx >= 0) {
        dragIdx.current = idx
      }
    },
    [getPos, findPoint]
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragIdx.current === null) return
      const pos = getPos(e)
      const newPoint = fromCanvas(pos.x, pos.y)
      const updated = curvePoints.map((p, i) => (i === dragIdx.current ? newPoint : p))
      setCurvePoints(updated)
    },
    [curvePoints, setCurvePoints, getPos]
  )

  const onMouseUp = useCallback(() => {
    dragIdx.current = null
  }, [])

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = getPos(e)
      if (findPoint(pos.x, pos.y) >= 0) return
      const newPoint = fromCanvas(pos.x, pos.y)
      const updated = [...curvePoints, newPoint].sort((a, b) => a.x - b.x)
      setCurvePoints(updated)
    },
    [curvePoints, setCurvePoints, getPos, findPoint]
  )

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const pos = getPos(e)
      const idx = findPoint(pos.x, pos.y)
      if (idx < 0 || curvePoints.length <= 2) return
      const updated = curvePoints.filter((_, i) => i !== idx)
      setCurvePoints(updated)
    },
    [curvePoints, setCurvePoints, getPos, findPoint]
  )

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="rounded-lg cursor-crosshair border border-white/10"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    />
  )
}
