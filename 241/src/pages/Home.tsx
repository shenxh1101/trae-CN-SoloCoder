import { useRef, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import AbstractTree from '@/components/AbstractTree'
import Environment3D from '@/components/Environment3D'
import FallingLeaves from '@/components/FallingLeaves'
import CameraController from '@/components/CameraController'
import ControlPanel from '@/components/ControlPanel'
import BreathButton from '@/components/BreathButton'
import BreathProgressRing from '@/components/BreathProgressRing'
import CameraPreview from '@/components/CameraPreview'
import { useTreeStore } from '@/store'
import { useCameraBreath } from '@/hooks/useCameraBreath'

export default function Home() {
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const { startCamera, stopCamera, setVideoElement, setCanvasElement } = useCameraBreath()

  const breathMode = useTreeStore((s) => s.breathMode)
  const setBreathValue = useTreeStore((s) => s.setBreathValue)
  const breathValue = useTreeStore((s) => s.breathValue)
  const branchData = useTreeStore((s) => s.branchData)

  useEffect(() => {
    if (breathMode === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [breathMode, startCamera, stopCamera])

  const handleScreenshot = useCallback(() => {
    const wrapper = canvasWrapperRef.current
    if (!wrapper) return

    const canvas = wrapper.querySelector('canvas')
    if (!canvas) return

    try {
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `breathing-tree-${Date.now()}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.warn('Screenshot failed:', e)
    }
  }, [])

  const handleExport = useCallback(() => {
    if (!branchData) {
      alert('树数据尚未生成，请稍候')
      return
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      preset: useTreeStore.getState().treePreset,
      breathValue: useTreeStore.getState().breathValue,
      windStrength: useTreeStore.getState().windStrength,
      lockedParts: useTreeStore.getState().lockedParts,
      skeleton: branchData,
    }

    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `tree-skeleton-${Date.now()}.json`
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [branchData])

  return (
    <div className="w-full h-screen relative overflow-hidden bg-[#0a1f0d]">
      <div ref={canvasWrapperRef} className="w-full h-full">
        <Canvas
          shadows
          gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false }}
          camera={{ position: [0, 6, 12], fov: 50 }}
        >
          <Environment3D />
          <AbstractTree />
          <FallingLeaves />
          <CameraController />
          <EffectComposer>
            <Bloom intensity={0.4} luminanceThreshold={0.5} mipmapBlur />
          </EffectComposer>
        </Canvas>
      </div>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <h1 className="text-3xl font-serif text-white/80 tracking-widest font-light">
          呼吸之树
        </h1>
      </div>

      <ControlPanel onScreenshot={handleScreenshot} onExport={handleExport} />

      <CameraPreview videoRef={setVideoElement} canvasRef={setCanvasElement} />

      {breathMode === 'slider' && (
        <div className="absolute left-4 bottom-6 z-50 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 p-4 w-56">
          <label className="text-xs text-white/80 block mb-2">呼吸控制 Breath Control</label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(breathValue * 100)}
            onChange={(e) => setBreathValue(Number(e.target.value) / 100)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-emerald-400"
          />
          <div className="text-xs text-white/60 mt-1 text-right">
            {Math.round(breathValue * 100)}%
          </div>
        </div>
      )}

      {breathMode === 'camera' && (
        <div className="absolute left-[232px] bottom-6 z-50 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 p-3 w-44">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">摄像头检测中</span>
          </div>
          <p className="text-[10px] text-white/50 leading-relaxed">
            面对摄像头，保持胸腹部在画面内。帧差法检测呼吸运动幅度。
          </p>
        </div>
      )}

      <BreathButton />
      <BreathProgressRing />

      <div className="absolute bottom-4 right-1/2 translate-x-1/2 z-40 pointer-events-none">
        <p className="text-xs text-white/30 text-center whitespace-nowrap">
          {breathMode === 'manual' && '按住按钮吸气 · 松开呼气'}
          {breathMode === 'slider' && '拖动滑块调节呼吸值'}
          {breathMode === 'camera' && '面向摄像头自然呼吸'}
          {' · 拖动鼠标旋转视角'}
        </p>
      </div>
    </div>
  )
}
