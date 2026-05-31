import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { StairScene } from './components/Scene3D/StairScene';
import { HUD } from './components/HUD/HUD';
import { Shortcuts } from './components/Shortcuts/Shortcuts';
import { ControlPanel } from './components/ControlPanel/ControlPanel';
import { useSceneStore } from './store/useSceneStore';

interface ComposerType {
  render: () => void;
}

function App() {
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [composer, setComposer] = useState<ComposerType | null>(null);
  const controlsLocked = useSceneStore((state) => state.controlsLocked);
  const [showEscHint, setShowEscHint] = useState(false);

  useEffect(() => {
    document.title = '无尽阶梯 | Endless Stairs';
  }, []);

  useEffect(() => {
    if (controlsLocked) {
      setShowEscHint(true);
      const timer = setTimeout(() => setShowEscHint(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [controlsLocked]);

  const handleRendererReady = (gl: THREE.WebGLRenderer, sc: THREE.Scene, cam: THREE.Camera) => {
    setRenderer(gl);
    setScene(sc);
    setCamera(cam as THREE.PerspectiveCamera);
  };

  const handleComposerReady = (comp: ComposerType | null) => {
    setComposer(comp);
  };

  return (
    <div className="w-full h-screen relative overflow-hidden bg-black">
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 1.6, 0] }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
      >
        <StairScene onRendererReady={handleRendererReady} onComposerReady={handleComposerReady} />
      </Canvas>

      {showEscHint && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-500">
          <div className="bg-black/70 backdrop-blur-md border border-cyan-500/30 rounded-lg px-5 py-2">
            <span className="text-cyan-400/80 font-mono text-xs">按 ESC 解锁鼠标</span>
          </div>
        </div>
      )}

      {!controlsLocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/70 backdrop-blur-lg border border-cyan-500/20 rounded-2xl px-10 py-8 text-center shadow-2xl shadow-cyan-500/5">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 mb-3 font-mono tracking-widest">
              无尽阶梯
            </h1>
            <p className="text-gray-500 text-sm font-mono tracking-wide mb-1">
              ENDLESS STAIRS
            </p>
            <div className="mt-4 pt-4 border-t border-gray-800/50">
              <p className="text-gray-400 text-sm font-mono">
                点击屏幕开始探索
              </p>
            </div>
          </div>
        </div>
      )}

      <HUD />
      <Shortcuts />
      <ControlPanel renderer={renderer} scene={scene} camera={camera} composer={composer} />

      {controlsLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="w-5 h-5 border-2 border-white/40 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-white/60 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
