import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { SplitSquareHorizontal, X } from 'lucide-react';
import ShoeModel from '@/components/three/ShoeModel';
import LightingSystem from '@/components/three/LightingSystem';
import { useConfigStore } from '@/store/useConfigStore';
import { createDefaultConfig } from '@/data/presets';
import { cn } from '@/lib/utils';

interface CompareViewProps {
  className?: string;
}

const SyncedCamera = ({ controlsRef }: { controlsRef: React.RefObject<any> }) => {
  const { camera } = useThree();

  useEffect(() => {
    const syncCamera = () => {
      if (controlsRef.current) {
        camera.position.copy(controlsRef.current.object.position);
        camera.rotation.copy(controlsRef.current.object.rotation);
      }
    };

    const interval = setInterval(syncCamera, 16);
    return () => clearInterval(interval);
  }, [camera, controlsRef]);

  return null;
};

const LeftScene = ({ controlsRef }: { controlsRef: React.RefObject<any> }) => {
  const defaultConfig = createDefaultConfig();

  return (
    <>
      <SyncedCamera controlsRef={controlsRef} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <ShoeModel isDefault customConfig={defaultConfig} />
    </>
  );
};

export const CompareView = ({ className }: CompareViewProps) => {
  const compareMode = useConfigStore((state) => state.compareMode);
  const setCompareMode = useConfigStore((state) => state.setCompareMode);
  const controlsRef = useRef<any>(null);

  if (!compareMode) return null;

  return (
    <div className={cn('fixed inset-0 z-50 bg-black/90', className)}>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-6 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/20">
        <SplitSquareHorizontal className="w-5 h-5 text-cyan-400" />
        <span className="text-white font-medium">对比视图</span>
        <div className="h-6 w-px bg-white/20" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white/30 border border-white/50" />
          <span className="text-white/60 text-sm">原始设计</span>
        </div>
        <div className="w-4 h-px bg-cyan-400" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400" />
          <span className="text-white/60 text-sm">当前设计</span>
        </div>
        <button
          onClick={() => setCompareMode(false)}
          className="ml-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex h-full">
        <div className="w-1/2 h-full relative border-r border-white/20">
          <div className="absolute top-20 left-4 px-3 py-1.5 bg-black/50 rounded-lg text-white/60 text-sm">
            默认配置
          </div>
          <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }} shadows>
            <LeftScene controlsRef={controlsRef} />
            <Environment preset="studio" />
          </Canvas>
        </div>

        <div className="w-1/2 h-full relative">
          <div className="absolute top-20 left-4 px-3 py-1.5 bg-cyan-500/30 border border-cyan-400/50 rounded-lg text-cyan-300 text-sm">
            当前设计
          </div>
          <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }} shadows>
            <OrbitControls
              ref={controlsRef}
              enableDamping
              dampingFactor={0.05}
              minDistance={2}
              maxDistance={8}
              target={[0, 0.6, 0]}
            />
            <LightingSystem />
            <Environment preset="studio" />
            <ShoeModel />
          </Canvas>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-sm">
        鼠标拖拽旋转 · 滚轮缩放 · 两个视图同步联动
      </div>
    </div>
  );
};

export default CompareView;
