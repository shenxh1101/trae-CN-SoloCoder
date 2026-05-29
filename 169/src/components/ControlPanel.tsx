import { useState } from 'react'
import { Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import Toolbar from './Toolbar'
import DepthSlider from './DepthSlider'
import ShapeSelector from './ShapeSelector'
import SpeedControls from './SpeedControls'
import BackgroundSelector from './BackgroundSelector'
import ColorModeSelector from './ColorModeSelector'
import WireframeToggle from './WireframeToggle'
import CameraControls from './CameraControls'
import StatsDisplay from './StatsDisplay'
import type { FractalStats } from '@/types'

interface ControlPanelProps {
  stats: FractalStats
  onScreenshot: () => void
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
      >
        <span>{title}</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && <div className="mt-1">{children}</div>}
    </div>
  )
}

export default function ControlPanel({ stats, onScreenshot }: ControlPanelProps) {
  return (
    <div className="absolute top-4 right-4 w-72 max-h-[calc(100vh-2rem)] overflow-y-auto bg-cyber-panel backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-5 flex flex-col scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="text-cyber-pink" size={20} />
        <h1 className="text-lg font-bold font-display text-white tracking-wider">
          分形万花筒
        </h1>
      </div>

      <Toolbar onScreenshot={onScreenshot} />

      <Section title="几何设置">
        <DepthSlider />
        <ShapeSelector />
      </Section>

      <Section title="动画设置">
        <SpeedControls />
        <CameraControls />
      </Section>

      <Section title="视觉设置">
        <BackgroundSelector />
        <ColorModeSelector />
        <WireframeToggle />
      </Section>

      <StatsDisplay stats={stats} />
    </div>
  )
}
