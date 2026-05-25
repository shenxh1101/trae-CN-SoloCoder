import React, { useRef, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import { Camera, Move, ZoomIn, ZoomOut, Maximize2, RotateCcw, SplitSquareHorizontal } from 'lucide-react';
import ShoeModel from '@/components/three/ShoeModel';
import LightingSystem from '@/components/three/LightingSystem';
import DecalSystem from '@/components/three/DecalSystem';
import { useConfigStore } from '@/store/useConfigStore';
import { downloadScreenshot } from '@/utils/screenshot';
import { cn } from '@/lib/utils';

interface ViewportProps {
  className?: string;
  onScreenshot?: (dataUrl: string) => void;
}

const Scene = ({ onScreenshotReady }: { onScreenshotReady?: (renderer: any, scene: any, camera: any) => void }) => {
  const { scene, camera, gl } = useThree();

  React.useEffect(() => {
    if (onScreenshotReady) {
      onScreenshotReady(gl, scene, camera);
    }
  }, [gl, scene, camera, onScreenshotReady]);

  return (
    <>
      <LightingSystem />
      <Environment preset="studio" />
      <ShoeModel />
      <DecalSystem />

      <ContactShadows
        position={[0, -0.05, 0]}
        opacity={0.5}
        scale={10}
        blur={2}
        far={4}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[3, 64]} />
        <meshStandardMaterial
          color="#0a0a0a"
          transparent
          opacity={0.8}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
          height={300}
          intensity={0.3}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
        <SMAA />
      </EffectComposer>
    </>
  );
};

export const Viewport = ({ className, onScreenshot }: ViewportProps) => {
  const controlsRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [showControls, setShowControls] = useState(true);
  const compareMode = useConfigStore((state) => state.compareMode);
  const setCompareMode = useConfigStore((state) => state.setCompareMode);

  const setThreeRefs = useConfigStore((state) => state.setThreeRefs);
  
  const handleRendererReady = useCallback((renderer: any, scene: any, camera: any) => {
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    setThreeRefs({ renderer, scene, camera });
  }, [setThreeRefs]);

  const handleScreenshot = useCallback(() => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      const dataUrl = downloadScreenshot(
        rendererRef.current,
        sceneRef.current,
        cameraRef.current,
        `shoe-design-${Date.now()}`,
        { scale: 2, format: 'png' }
      );
      if (onScreenshot && dataUrl) {
        onScreenshot(dataUrl);
      }
    }
  }, [onScreenshot]);

  const handleResetView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    if (controlsRef.current) {
      const distance = controlsRef.current.getDistance();
      controlsRef.current.minDistance = Math.max(1, distance - 0.5);
      controlsRef.current.object.position.multiplyScalar(0.9);
      controlsRef.current.update();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.object.position.multiplyScalar(1.1);
      controlsRef.current.update();
    }
  }, []);

  return (
    <div
      className={cn('relative h-full w-full bg-gradient-to-b from-gray-900 to-black', className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 4], fov: 45 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0a0a']} />
        <fog attach="fog" args={['#0a0a0a', 8, 15]} />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={8}
          target={[0, 0.6, 0]}
          maxPolarAngle={Math.PI / 2 + 0.2}
        />

        <Scene onScreenshotReady={handleRendererReady} />
      </Canvas>

      <div
        className={cn(
          'absolute top-4 right-4 flex flex-col gap-2 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        <button
          onClick={handleScreenshot}
          className="p-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg text-white/70 hover:text-white hover:bg-white/10 hover:border-cyan-400/50 transition-all group"
          title="截图 (S)"
        >
          <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={handleResetView}
          className="p-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg text-white/70 hover:text-white hover:bg-white/10 hover:border-cyan-400/50 transition-all group"
          title="重置视角"
        >
          <RotateCcw className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={handleZoomIn}
          className="p-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg text-white/70 hover:text-white hover:bg-white/10 hover:border-cyan-400/50 transition-all group"
          title="放大"
        >
          <ZoomIn className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={handleZoomOut}
          className="p-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg text-white/70 hover:text-white hover:bg-white/10 hover:border-cyan-400/50 transition-all group"
          title="缩小"
        >
          <ZoomOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={() => setCompareMode(!compareMode)}
          className={cn(
            'p-3 backdrop-blur-md border rounded-lg transition-all group',
            compareMode
              ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300'
              : 'bg-black/60 border-white/20 text-white/70 hover:text-white hover:bg-white/10 hover:border-cyan-400/50'
          )}
          title="对比视图 (C)"
        >
          <SplitSquareHorizontal className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      <div
        className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/20 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex items-center gap-2 text-white/50 text-xs">
          <Move className="w-4 h-4" />
          <span>拖拽旋转</span>
        </div>
        <div className="w-px h-4 bg-white/20" />
        <div className="flex items-center gap-2 text-white/50 text-xs">
          <ZoomIn className="w-4 h-4" />
          <span>滚轮缩放</span>
        </div>
        <div className="w-px h-4 bg-white/20" />
        <div className="flex items-center gap-2 text-white/50 text-xs">
          <Maximize2 className="w-4 h-4" />
          <span>右键平移</span>
        </div>
      </div>
    </div>
  );
};

export default Viewport;
