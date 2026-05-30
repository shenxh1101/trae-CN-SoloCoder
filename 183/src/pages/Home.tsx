import { useState } from 'react';
import * as THREE from 'three';
import { NebulaScene } from '@/components/NebulaScene';
import { ControlPanel } from '@/components/ControlPanel';
import { EffectsPanel } from '@/components/EffectsPanel';
import { Toolbar } from '@/components/Toolbar';
import { StatusBar } from '@/components/StatusBar';

export default function Home() {
  const [gl, setGl] = useState<THREE.WebGLRenderer | null>(null);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050510]">
      <NebulaScene onReady={(renderer) => setGl(renderer)} />
      <ControlPanel />
      <EffectsPanel />
      <Toolbar gl={gl} />
      <StatusBar />

      <div className="absolute top-4 left-4 z-10">
        <h1 
          className="text-2xl font-bold text-white tracking-widest"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          星云旋涡
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Nebula Vortex Visualizer
        </p>
      </div>

      <div className="absolute bottom-4 right-4 z-10 text-xs text-gray-500">
        <p>拖拽旋转 · 滚轮缩放</p>
      </div>
    </div>
  );
}
