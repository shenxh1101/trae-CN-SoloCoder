import Scene3D from '@/components/Scene3D';
import ControlPanel from '@/components/ControlPanel';
import FPSDisplay from '@/components/FPSDisplay';
import MusicPlayer from '@/components/MusicPlayer';

export default function Home() {
  return (
    <div className="w-full h-screen overflow-hidden relative">
      <Scene3D />
      <ControlPanel />
      <FPSDisplay />
      <MusicPlayer />

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div className="text-white/60 text-sm text-center">
          <p>🖱️ 拖拽旋转视角 · 滚轮缩放</p>
        </div>
      </div>

      <h1 className="fixed top-4 left-1/2 -translate-x-1/2 z-40 text-white text-2xl font-bold tracking-wider drop-shadow-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
        ❄️ 下雪的村庄 ❄️
      </h1>
    </div>
  );
}
