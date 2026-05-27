import Scene from '@/components/Scene';
import ControlPanel from '@/components/ControlPanel';
import ParticleStats from '@/components/ParticleStats';

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Scene />
      <ControlPanel />
      <ParticleStats />
      
      <div className="absolute top-4 left-4 px-4 py-3 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl">
        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          3D 粒子文字
        </h1>
        <p className="text-xs text-gray-400 mt-1">拖拽旋转视角 · 滚轮缩放</p>
      </div>
    </div>
  );
}
