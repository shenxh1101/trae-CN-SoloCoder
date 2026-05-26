import { useRef, useCallback, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStarStore } from '@/store/useStarStore';
import StarField from './StarField';
import NebulaSystem from './NebulaSystem';
import CloudSystem from './CloudSystem';
import MeteorSystem from './MeteorSystem';

function SceneBackground() {
  const { backgroundType } = useStarStore();
  const { scene } = useThree();

  useEffect(() => {
    if (backgroundType === 'black') {
      scene.background = new THREE.Color(0x000000);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, '#0a0a20');
      gradient.addColorStop(0.5, '#0d1033');
      gradient.addColorStop(1, '#000510');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2, 512);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      scene.background = texture;
    }
  }, [backgroundType, scene]);

  return null;
}

function AutoRotate() {
  const { autoRotate } = useStarStore();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 0.5;
      controlsRef.current.update();
    }
  }, [autoRotate]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      minDistance={50}
      maxDistance={300}
    />
  );
}

function ClickHandler() {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  const handleClick = useCallback(
    (event: MouseEvent) => {
      const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);
      raycaster.current.params.Points.threshold = 5;

      const allPoints: THREE.Points[] = [];
      scene.traverse((object) => {
        if (object instanceof THREE.Points) {
          allPoints.push(object);
        }
      });

      const intersects = raycaster.current.intersectObjects(allPoints, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const index = hit.index;
        const point = hit.point;

        console.log('点击粒子:');
        console.log('  索引:', index);
        console.log('  位置:', {
          x: point.x.toFixed(2),
          y: point.y.toFixed(2),
          z: point.z.toFixed(2),
        });
      }
    },
    [camera, scene]
  );

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', handleClick);
      return () => canvas.removeEventListener('click', handleClick);
    }
  }, [handleClick]);

  return null;
}

interface StarSceneProps {
  onReady: () => void;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

export default function StarScene({ onReady, onCanvasReady }: StarSceneProps) {
  const {
    particleCount,
    particleSize,
    autoRotate,
    nebulaEnabled,
    nebulaColor,
    backgroundType,
    cloudEnabled,
    meteorEnabled,
    twinkleSpeed,
  } = useStarStore();

  useEffect(() => {
    const timer = setTimeout(onReady, 100);
    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <Canvas
      camera={{
        position: [0, 0, 100],
        fov: 75,
        near: 0.1,
        far: 1000,
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0x000000, 1);
        onCanvasReady(gl.domElement);
      }}
    >
      <SceneBackground />
      <AutoRotate />
      <ClickHandler />

      <ambientLight intensity={0.2} />

      <StarField
        key={`starfield-${particleCount}`}
        count={particleCount}
        size={particleSize}
        twinkleSpeed={twinkleSpeed}
      />

      <NebulaSystem
        enabled={nebulaEnabled}
        color={nebulaColor}
      />

      <CloudSystem enabled={cloudEnabled} />

      <MeteorSystem enabled={meteorEnabled} />
    </Canvas>
  );
}
