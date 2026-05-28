import { Scene3D } from '@/components/Scene3D'
import { ControlPanel } from '@/components/ControlPanel'
import { Toolbar } from '@/components/Toolbar'
import { StatusBar } from '@/components/StatusBar'
import { AudioController } from '@/components/AudioController'

export default function Home() {
  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      <Scene3D />
      <Toolbar />
      <ControlPanel />
      <StatusBar />
      <AudioController />

      <div className="fixed top-4 left-4 z-20 flex items-center gap-2">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-wider">KALEIDOSCOPE</h1>
          <p className="text-xs text-gray-400">3D万花筒</p>
        </div>
      </div>
    </div>
  )
}
