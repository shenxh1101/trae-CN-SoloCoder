import Scene3D from '@/components/Scene3D'
import ControlPanel from '@/components/ControlPanel'
import StatusBar from '@/components/StatusBar'

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0f]">
      <ControlPanel />
      <div className="flex-1 relative">
        <Scene3D />
        <StatusBar />
      </div>
    </div>
  )
}
