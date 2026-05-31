import { useEffect, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import { StairGenerator } from '../../core/StairGenerator';
import { ParticleSystem } from '../../core/ParticleSystem';
import { MovementController } from '../../core/MovementController';
import { AudioManager } from '../../core/AudioManager';
import { StyleSystem } from '../../core/StyleSystem';
import {
  useConfig,
  useCameraMode,
  useSceneActions,
} from '../../store/useSceneStore';
import { VisualStyle, BackgroundType } from '../../types';
import type { FootstepStyle } from '../../core/AudioManager';

type ComposerRef = { render: () => void } | null;

interface StairSceneProps {
  onRendererReady: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => void;
  onComposerReady?: (composer: { render: () => void } | null) => void;
}

export function StairScene({ onRendererReady, onComposerReady }: StairSceneProps) {
  const { scene, camera, gl } = useThree();
  const config = useConfig();
  const cameraMode = useCameraMode();
  const actions = useSceneActions();

  const stairGeneratorRef = useRef<StairGenerator | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const movementControllerRef = useRef<MovementController | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const styleSystemRef = useRef<StyleSystem | null>(null);
  const stairGroupRef = useRef<THREE.Group | null>(null);
  const particleGroupRef = useRef<THREE.Group | null>(null);
  const backgroundGroupRef = useRef<THREE.Group | null>(null);
  const timeRef = useRef(0);
  const lastStairIndexRef = useRef(0);
  const initializedRef = useRef(false);
  const backgroundTransitionRef = useRef<number | null>(null);
  const composerRef = useRef<{ render: () => void } | null>(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    stairGroupRef.current = new THREE.Group();
    particleGroupRef.current = new THREE.Group();
    backgroundGroupRef.current = new THREE.Group();

    scene.add(stairGroupRef.current);
    scene.add(particleGroupRef.current);
    scene.add(backgroundGroupRef.current);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(ambientLight);
    scene.add(directionalLight);

    stairGeneratorRef.current = new StairGenerator(config);
    particleSystemRef.current = new ParticleSystem(config);
    audioManagerRef.current = new AudioManager(
      config.soundEnabled,
      config.soundVolume
    );
    movementControllerRef.current = new MovementController(
      config,
      stairGeneratorRef.current,
      audioManagerRef.current
    );
    styleSystemRef.current = new StyleSystem(
      config.seed,
      config.stairColor,
      config.accentColor
    );

    stairGeneratorRef.current.getSteps(0, stairGroupRef.current);
    particleSystemRef.current.addToScene(particleGroupRef.current);

    updateBackground(config.background);
    updateLighting(config.style);
    updateFog(config.style);

    onRendererReady(gl, scene, camera);

    return () => {
      if (backgroundTransitionRef.current) {
        cancelAnimationFrame(backgroundTransitionRef.current);
      }
      stairGeneratorRef.current?.dispose();
      particleSystemRef.current?.dispose();
      audioManagerRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!stairGeneratorRef.current || !initializedRef.current) return;

    stairGeneratorRef.current.updateConfig(config);
    particleSystemRef.current?.updateConfig(config);
    movementControllerRef.current?.updateConfig(config);
    styleSystemRef.current?.updateSeed(config.seed);
    styleSystemRef.current?.updateColors(config.stairColor, config.accentColor);

    const styleMap: Record<VisualStyle, FootstepStyle> = {
      neon: 'metal',
      stone: 'stone',
      glass: 'glass',
    };
    audioManagerRef.current?.setFootstepStyle(styleMap[config.style]);
    audioManagerRef.current?.setEnabled(config.soundEnabled);
    audioManagerRef.current?.setVolume(config.soundVolume);

    updateBackground(config.background);
    updateLighting(config.style);
    updateFog(config.style);

    if (stairGroupRef.current) {
      stairGeneratorRef.current.getSteps(
        movementControllerRef.current?.getState().currentStairIndex || 0,
        stairGroupRef.current
      );
    }
  }, [config]);

  useEffect(() => {
    movementControllerRef.current?.setCameraMode(cameraMode);
  }, [cameraMode]);

  const disposeChild = useCallback((child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  }, []);

  const updateBackground = useCallback((type: BackgroundType) => {
    if (!backgroundGroupRef.current) return;

    if (backgroundTransitionRef.current) {
      cancelAnimationFrame(backgroundTransitionRef.current);
      backgroundTransitionRef.current = null;
    }

    while (backgroundGroupRef.current.children.length > 0) {
      const child = backgroundGroupRef.current.children[0];
      backgroundGroupRef.current.remove(child);
      disposeChild(child);
    }

    if (type === 'starfield') {
      const starCount = 2000;
      const batchSize = 200;
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);
      let createdCount = 0;

      const createBatch = () => {
        const end = Math.min(createdCount + batchSize, starCount);
        
        for (let i = createdCount; i < end; i++) {
          const idx = i * 3;
          const radius = 100 + Math.random() * 200;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);

          positions[idx] = radius * Math.sin(phi) * Math.cos(theta);
          positions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta) + 50;
          positions[idx + 2] = radius * Math.cos(phi);

          const hue = 0.55 + Math.random() * 0.1;
          const lightness = 0.8 + Math.random() * 0.2;
          const color = new THREE.Color().setHSL(hue, 0.2, lightness);
          colors[idx] = color.r;
          colors[idx + 1] = color.g;
          colors[idx + 2] = color.b;
        }
        
        createdCount = end;

        if (createdCount >= starCount && backgroundGroupRef.current) {
          const starGeometry = new THREE.BufferGeometry();
          starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

          const starMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0,
          });

          const stars = new THREE.Points(starGeometry, starMaterial);
          backgroundGroupRef.current.add(stars);

          let opacity = 0;
          const fadeIn = () => {
            opacity = Math.min(1, opacity + 0.05);
            starMaterial.opacity = opacity;
            if (opacity < 0.8) {
              backgroundTransitionRef.current = requestAnimationFrame(fadeIn);
            }
          };
          backgroundTransitionRef.current = requestAnimationFrame(fadeIn);
        } else {
          backgroundTransitionRef.current = requestAnimationFrame(createBatch);
        }
      };

      backgroundTransitionRef.current = requestAnimationFrame(createBatch);
    } else {
      const elements: Array<{ geometry: THREE.BufferGeometry; material: THREE.Material; mesh: THREE.Object3D }> = [];

      const abyssGeometry = new THREE.SphereGeometry(300, 32, 32);
      const abyssMaterial = new THREE.MeshBasicMaterial({
        color: 0x000005,
        side: THREE.BackSide,
      });
      const abyss = new THREE.Mesh(abyssGeometry, abyssMaterial);
      elements.push({ geometry: abyssGeometry, material: abyssMaterial, mesh: abyss });

      const vortexGeometry = new THREE.TorusGeometry(50, 2, 16, 100);
      const vortexMaterial = new THREE.MeshBasicMaterial({
        color: 0x1a0033,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const vortex = new THREE.Mesh(vortexGeometry, vortexMaterial);
      vortex.position.y = -20;
      vortex.rotation.x = Math.PI / 2;
      elements.push({ geometry: vortexGeometry, material: vortexMaterial, mesh: vortex });

      const fogCount = 500;
      const fogPositions = new Float32Array(fogCount * 3);
      for (let i = 0; i < fogCount * 3; i += 3) {
        fogPositions[i] = (Math.random() - 0.5) * 100;
        fogPositions[i + 1] = -30 + Math.random() * 20;
        fogPositions[i + 2] = (Math.random() - 0.5) * 100;
      }
      const fogGeometry = new THREE.BufferGeometry();
      fogGeometry.setAttribute('position', new THREE.BufferAttribute(fogPositions, 3));
      const fogMaterial = new THREE.PointsMaterial({
        size: 2,
        color: 0x330066,
        transparent: true,
        opacity: 0,
      });
      const fogPoints = new THREE.Points(fogGeometry, fogMaterial);
      elements.push({ geometry: fogGeometry, material: fogMaterial, mesh: fogPoints });

      elements.forEach(el => backgroundGroupRef.current?.add(el.mesh));

      let opacity = 0;
      const fadeIn = () => {
        opacity = Math.min(1, opacity + 0.05);
        vortexMaterial.opacity = opacity * 0.3;
        fogMaterial.opacity = opacity * 0.4;
        if (opacity < 1) {
          backgroundTransitionRef.current = requestAnimationFrame(fadeIn);
        }
      };
      backgroundTransitionRef.current = requestAnimationFrame(fadeIn);
    }
  }, [disposeChild]);

  const updateLighting = useCallback((style: VisualStyle) => {
    if (!styleSystemRef.current) return;

    const lightConfig = styleSystemRef.current.getLightConfig(style);
    scene.traverse((obj) => {
      if (obj instanceof THREE.AmbientLight) {
        obj.intensity = lightConfig.ambient;
      }
      if (obj instanceof THREE.DirectionalLight) {
        obj.intensity = lightConfig.directional;
        obj.position.set(...lightConfig.position);
      }
    });
  }, []);

  const updateFog = useCallback((style: VisualStyle) => {
    if (!styleSystemRef.current) return;

    const fogConfig = styleSystemRef.current.getFogConfig(style);
    const bgColor = styleSystemRef.current.getBackgroundColor(style);

    scene.fog = new THREE.Fog(fogConfig.color, fogConfig.near, fogConfig.far);
    scene.background = bgColor;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      movementControllerRef.current?.handleKeyDown(e.code);

      if (e.code === 'KeyV' && !e.repeat) {
        actions.toggleCameraMode();
      }
      if (e.code === 'KeyR' && !e.repeat) {
        movementControllerRef.current?.reset();
        actions.resetStats();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      movementControllerRef.current?.handleKeyUp(e.code);
    };

    const handleMouseMove = (e: MouseEvent) => {
      movementControllerRef.current?.handleMouseMove(
        e.movementX,
        e.movementY
      );
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      movementControllerRef.current?.setPointerLocked(locked);
      actions.setControlsLocked(locked);
    };

    const handleClick = () => {
      if (!movementControllerRef.current?.isPointerLocked()) {
        gl.domElement.requestPointerLock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    gl.domElement.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!movementControllerRef.current) return;

    const deltaTime = Math.min(delta, 0.1);
    timeRef.current += deltaTime;

    const movementState = movementControllerRef.current.update(deltaTime);
    const currentIndex = movementState.currentStairIndex;

    if (currentIndex !== lastStairIndexRef.current) {
      if (currentIndex > lastStairIndexRef.current) {
        actions.incrementStairCount();
      }
      lastStairIndexRef.current = currentIndex;

      if (stairGroupRef.current && stairGeneratorRef.current) {
        stairGeneratorRef.current.getSteps(currentIndex, stairGroupRef.current);
      }

      actions.setPosition({
        x: movementState.position.x,
        y: movementState.position.y,
        z: movementState.position.z,
        stairIndex: currentIndex,
      });
    }

    const cameraPos = movementControllerRef.current.getCameraPosition();
    const cameraRot = movementControllerRef.current.getCameraRotation();

    camera.position.copy(cameraPos);
    camera.rotation.copy(cameraRot);

    if (movementState.isMoving) {
      actions.updateTotalTime(deltaTime);
      actions.setWalking(true);
    } else {
      actions.setWalking(false);
    }

    if (particleSystemRef.current) {
      particleSystemRef.current.update(
        timeRef.current,
        currentIndex
      );
    }
  });

  const bloomConfig = styleSystemRef.current?.getBloomConfig(config.style) || {
    enabled: false,
    intensity: 0,
    luminanceThreshold: 1,
    luminanceSmoothing: 0.9,
  };

  useEffect(() => {
    if (onComposerReady) {
      onComposerReady(composerRef.current);
    }
  }, [onComposerReady]);

  return (
    <>
      <EffectComposer ref={composerRef as any} enabled={true}>
        {bloomConfig.enabled && (
          <Bloom
            intensity={bloomConfig.intensity}
            luminanceThreshold={bloomConfig.luminanceThreshold}
            luminanceSmoothing={bloomConfig.luminanceSmoothing}
            mipmapBlur
          />
        )}
        <FXAA />
      </EffectComposer>
    </>
  );
}
