import { Volume2, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface WelcomeHintProps {
  autoDismiss?: boolean
}

export function WelcomeHint({ autoDismiss = true }: WelcomeHintProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!dismissed) {
        setVisible(true)
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [dismissed])

  useEffect(() => {
    if (autoDismiss && visible) {
      const handleFirstInteraction = () => {
        setDismissed(true)
      }
      window.addEventListener('click', handleFirstInteraction, { once: true })
      return () => window.removeEventListener('click', handleFirstInteraction)
    }
  }, [autoDismiss, visible])

  if (!visible || dismissed) return null

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/30 animate-pulse-glow">
          <Volume2 className="w-5 h-5 text-blue-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-white/90 font-medium tracking-wide"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            点击任意区域启用音效
          </p>
          <p className="text-xs text-white/40 mt-0.5"
            style={{ fontFamily: "'Exo 2', sans-serif" }}>
            体验沉浸式空灵环境音乐
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setDismissed(true)
          }}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
