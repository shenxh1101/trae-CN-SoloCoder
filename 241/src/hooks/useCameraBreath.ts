import { useRef, useCallback } from 'react'
import { useTreeStore } from '@/store'

const CHEST_REGION = { x1: 0.2, x2: 0.8, y1: 0.2, y2: 0.8 }
const MOTION_SMOOTHING = 0.25
const BREATH_SMOOTHING = 0.12
const HISTORY_SIZE = 30

export function useCameraBreath() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number>(0)
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null)
  const motionSmoothedRef = useRef<number>(0)
  const breathSmoothedRef = useRef<number>(0.5)
  const motionHistoryRef = useRef<number[]>([])
  const isActiveRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)

  const setVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
    if (el && streamRef.current && !el.srcObject) {
      el.srcObject = streamRef.current
      el.play().catch(() => {})
    }
  }, [])

  const setCanvasElement = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el
  }, [])

  const startDetection = useCallback(() => {
    if (!streamRef.current) return

    const waitForElements = () => {
      if (!isActiveRef.current) return
      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(waitForElements)
        return
      }

      prevFrameRef.current = null
      motionSmoothedRef.current = 0
      breathSmoothedRef.current = useTreeStore.getState().breathValue
      motionHistoryRef.current = []

      const detect = () => {
        if (!isActiveRef.current || !videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
          animFrameRef.current = requestAnimationFrame(detect)
          return
        }

        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!

        const cw = 160
        const ch = 120
        canvas.width = cw
        canvas.height = ch

        ctx.save()
        ctx.translate(cw, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0, cw, ch)
        ctx.restore()

        const x1 = Math.floor(cw * CHEST_REGION.x1)
        const x2 = Math.floor(cw * CHEST_REGION.x2)
        const y1 = Math.floor(ch * CHEST_REGION.y1)
        const y2 = Math.floor(ch * CHEST_REGION.y2)

        const roiData = ctx.getImageData(x1, y1, x2 - x1, y2 - y1)
        const pixels = roiData.data

        if (prevFrameRef.current && prevFrameRef.current.length === pixels.length) {
          const prev = prevFrameRef.current
          let totalDiff = 0
          let pixelCount = 0

          for (let i = 0; i < pixels.length; i += 16) {
            const rDiff = Math.abs(pixels[i] - prev[i])
            const gDiff = Math.abs(pixels[i + 1] - prev[i + 1])
            const bDiff = Math.abs(pixels[i + 2] - prev[i + 2])
            totalDiff += (rDiff + gDiff + bDiff) / 3
            pixelCount++
          }

          const avgMotion = pixelCount > 0 ? totalDiff / pixelCount : 0

          motionSmoothedRef.current = motionSmoothedRef.current * (1 - MOTION_SMOOTHING) + avgMotion * MOTION_SMOOTHING

          const normalizedMotion = Math.min(motionSmoothedRef.current / 15, 1)

          motionHistoryRef.current.push(normalizedMotion)
          if (motionHistoryRef.current.length > HISTORY_SIZE) {
            motionHistoryRef.current.shift()
          }

          if (motionHistoryRef.current.length >= 8) {
            const recent = motionHistoryRef.current.slice(-8)
            const motionAvg = recent.reduce((a, b) => a + b, 0) / recent.length

            const prevSlice = motionHistoryRef.current.slice(-16, -8)
            const prevAvg = prevSlice.length > 0 ? prevSlice.reduce((a, b) => a + b, 0) / prevSlice.length : motionAvg

            const motionTrend = motionAvg - prevAvg

            if (motionTrend > 0.01) {
              breathSmoothedRef.current = Math.min(1, breathSmoothedRef.current + normalizedMotion * 0.04)
            } else if (motionTrend < -0.01) {
              breathSmoothedRef.current = Math.max(0, breathSmoothedRef.current - normalizedMotion * 0.03)
            } else {
              breathSmoothedRef.current = breathSmoothedRef.current * 0.995 + 0.5 * 0.005
            }

            const currentStoreBreath = useTreeStore.getState().breathValue
            const finalBreath = breathSmoothedRef.current * (1 - BREATH_SMOOTHING) + currentStoreBreath * BREATH_SMOOTHING
            breathSmoothedRef.current = finalBreath

            useTreeStore.getState().setBreathValue(finalBreath)
          }
        }

        prevFrameRef.current = new Uint8ClampedArray(pixels)

        animFrameRef.current = requestAnimationFrame(detect)
      }

      animFrameRef.current = requestAnimationFrame(detect)
    }

    animFrameRef.current = requestAnimationFrame(waitForElements)
  }, [])

  const startCamera = useCallback(async () => {
    if (isActiveRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false,
      })

      streamRef.current = stream
      isActiveRef.current = true

      if (videoRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }

      startDetection()
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err)
      isActiveRef.current = false
      useTreeStore.getState().setBreathMode('slider')
    }
  }, [startDetection])

  const stopCamera = useCallback(() => {
    isActiveRef.current = false
    cancelAnimationFrame(animFrameRef.current)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    prevFrameRef.current = null
  }, [])

  return { startCamera, stopCamera, setVideoElement, setCanvasElement }
}
