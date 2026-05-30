import { CrystalBallScene } from '@/components/crystal-ball/CrystalBallScene'
import { ControlPanel } from '@/components/ui/ControlPanel'
import { WelcomeHint } from '@/components/ui/WelcomeHint'
import { useAmbientSound } from '@/hooks/useAmbientSound'
import { useCallback } from 'react'

export default function Home() {
  const { initAudio } = useAmbientSound()

  const handleSceneClick = useCallback(() => {
    initAudio()
  }, [initAudio])

  return (
    <div className="w-screen h-screen overflow-hidden bg-black" onClick={handleSceneClick}>
      <CrystalBallScene />
      <ControlPanel />
      <WelcomeHint />
    </div>
  )
}
