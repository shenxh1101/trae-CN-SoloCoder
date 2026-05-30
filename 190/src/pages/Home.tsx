import { useEffect, useRef, useState, useCallback } from 'react'
import Scene from '@/components/Scene'
import ControlPanel from '@/components/ControlPanel'
import Toast from '@/components/Toast'

interface ToastData {
  message: string
  type: 'success' | 'error' | 'info'
  id: number
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { message, type, id }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.download = `magic-circle-${Date.now()}.png`
            link.href = url
            link.click()
            URL.revokeObjectURL(url)
            showToast('截图已保存！', 'success')
          } else {
            showToast('截图失败，请重试', 'error')
          }
        }, 'image/png', 1.0)
      } catch (e) {
        showToast('截图失败，请重试', 'error')
      }
    } else {
      showToast('未找到画布', 'error')
    }
  }, [showToast])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleScreenshot()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <div ref={containerRef} className="w-full h-screen relative overflow-hidden">
      <div className="absolute inset-0">
        <Scene />
      </div>
      
      <ControlPanel onScreenshot={handleScreenshot} />

      <div className="absolute bottom-4 left-4 text-white/60 text-sm">
        <p>鼠标拖拽旋转视角 | 滚轮缩放</p>
        <p className="mt-1">Ctrl+S 快速截图</p>
      </div>

      <div className="absolute top-4 left-4">
        <h1 className="text-2xl font-bold text-white/90 tracking-wider" style={{ fontFamily: 'Cinzel, serif' }}>
          ✦ 魔法阵 ✦
        </h1>
        <p className="text-white/50 text-sm mt-1">Magic Circle Generator</p>
      </div>

      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}
