import { useState, useCallback, useRef } from 'react'
import FractalScene from './components/FractalScene'
import ControlPanel from './components/ControlPanel'
import { takeScreenshot } from './utils/screenshot'
import type { FractalStats } from './types'

function App() {
  const [stats, setStats] = useState<FractalStats>({
    vertices: 0,
    faces: 0,
    instances: 0,
  })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleStatsUpdate = useCallback((newStats: FractalStats) => {
    setStats(newStats)
  }, [])

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas')
    takeScreenshot(canvas, 'fractal-kaleidoscope')
  }, [])

  return (
    <div ref={containerRef} className="w-screen h-screen relative overflow-hidden bg-black">
      <FractalScene onStatsUpdate={handleStatsUpdate} />
      <ControlPanel stats={stats} onScreenshot={handleScreenshot} />
    </div>
  )
}

export default App
