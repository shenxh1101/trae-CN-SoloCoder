import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ParticleSystem, ColorMode } from '@/lib/ParticleSystem';

interface ThreeSceneProps {
  particleCount: number;
  explosionForce: number;
  particleSize: number;
  colorMode: ColorMode;
  gravityEnabled: boolean;
  slowMotionEnabled: boolean;
  autoRotateEnabled: boolean;
  starBackground: boolean;
  onParticleCountChange: (count: number) => void;
}

export default function ThreeScene({
  particleCount,
  explosionForce,
  particleSize,
  colorMode,
  gravityEnabled,
  slowMotionEnabled,
  autoRotateEnabled,
  starBackground,
  onParticleCountChange,
}: ThreeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const animationIdRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const lastParticleCountRef = useRef<number>(particleCount);

  const createStarFieldTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, 2048, 2048);
    
    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 2048;
      const radius = Math.random() * 1.5 + 0.5;
      const brightness = Math.random() * 0.5 + 0.5;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.fill();
    }
    
    const gradient = ctx.createRadialGradient(1024, 1024, 0, 1024, 1024, 1024);
    gradient.addColorStop(0, 'rgba(20, 0, 40, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 2048);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    if (starBackground) {
      scene.background = createStarFieldTexture();
    } else {
      scene.background = new THREE.Color(0x0a0a1a);
    }

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 80);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.5;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    );
    composer.addPass(bloomPass);
    composerRef.current = composer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 200;
    controlsRef.current = controls;

    const particleSystem = new ParticleSystem(scene, {
      count: particleCount,
      force: explosionForce,
      size: particleSize,
      colorMode,
      gravity: gravityEnabled,
      slowMotion: slowMotionEnabled,
    });
    particleSystemRef.current = particleSystem;
    particleSystem.explode();
    onParticleCountChange(particleSystem.getCount());

    const handleResize = () => {
      if (!camera || !renderer || !composer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      const deltaTime = Math.min(clockRef.current.getDelta(), 0.1);
      
      if (particleSystemRef.current) {
        particleSystemRef.current.update(deltaTime);
      }
      
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotateEnabled;
        controlsRef.current.autoRotateSpeed = 0.5;
        controlsRef.current.update();
      }
      
      if (composerRef.current) {
        composerRef.current.render();
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      
      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (particleSystemRef.current && particleCount !== lastParticleCountRef.current) {
      particleSystemRef.current.setCount(particleCount);
      lastParticleCountRef.current = particleCount;
      onParticleCountChange(particleSystemRef.current.getCount());
    }
  }, [particleCount, onParticleCountChange]);

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setForce(explosionForce);
    }
  }, [explosionForce]);

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setSize(particleSize);
    }
  }, [particleSize]);

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setColorMode(colorMode);
    }
  }, [colorMode]);

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setGravity(gravityEnabled);
    }
  }, [gravityEnabled]);

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setSlowMotion(slowMotionEnabled);
    }
  }, [slowMotionEnabled]);

  useEffect(() => {
    if (sceneRef.current) {
      if (starBackground) {
        sceneRef.current.background = createStarFieldTexture();
      } else {
        sceneRef.current.background = new THREE.Color(0x0a0a1a);
      }
    }
  }, [starBackground, createStarFieldTexture]);

  const handleReplay = useCallback(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.reset();
    }
  }, []);

  const handleScreenshot = useCallback(() => {
    if (!rendererRef.current) return;
    
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `star-explosion-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0">
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-20">
        <button
          onClick={handleReplay}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          💥 重新爆炸
        </button>
        <button
          onClick={handleScreenshot}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          📸 截图
        </button>
      </div>
    </div>
  );
}
