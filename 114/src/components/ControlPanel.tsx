import { useState } from 'react'
import { ChevronRight, ChevronLeft, Settings } from 'lucide-react'
import { SymmetryModeSelector } from './SymmetryModeSelector'
import { SliderGroup } from './SliderGroup'
import { EffectToggles } from './EffectToggles'
import { BackgroundSelector } from './BackgroundSelector'

export function ControlPanel() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-l-lg
          hover:bg-black/80 transition-all duration-300 text-cyan-400 hover:text-cyan-300"
        style={{ right: isOpen ? '320px' : '0' }}
      >
        {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      <div
        className={`fixed right-0 top-0 h-full w-80 bg-black/70 backdrop-blur-xl border-l border-white/10
          transform transition-transform duration-300 z-10 overflow-y-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Settings className="text-cyan-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">控制面板</h2>
              <p className="text-xs text-gray-400">调整万花筒参数</p>
            </div>
          </div>

          <SymmetryModeSelector />

          <div className="h-px bg-white/10" />

          <SliderGroup />

          <div className="h-px bg-white/10" />

          <EffectToggles />

          <div className="h-px bg-white/10" />

          <BackgroundSelector />
        </div>
      </div>
    </>
  )
}
