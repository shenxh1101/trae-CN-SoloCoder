import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface MeteorSystemProps {
  enabled: boolean;
}

interface Meteor {
  id: number;
  line: THREE.Line;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  trailLength: number;
}

let meteorIdCounter = 0;

export default function MeteorSystem({ enabled }: MeteorSystemProps) {
  const meteorsRef = useRef<Meteor[]>([]);
  const lastSpawnRef = useRef(0);
  const { scene } = useThree();

  const TRAIL_POINTS = 30;

  const spawnMeteor = useCallback(() => {
    const startEdge = Math.floor(Math.random() * 6);
    const startPos = new THREE.Vector3();
    const endPos = new THREE.Vector3();

    const bounds = 200;

    switch (startEdge) {
      case 0:
        startPos.set(-bounds, (Math.random() - 0.5) * bounds, (Math.random() - 0.5) * bounds);
        endPos.set(bounds, (Math.random() - 0.5) * bounds, (Math.random() - 0.5) * bounds);
        break;
      case 1:
        startPos.set(bounds, (Math.random() - 0.5) * bounds, (Math.random() - 0.5) * bounds);
        endPos.set(-bounds, (Math.random() - 0.5) * bounds, (Math.random() - 0.5) * bounds);
        break;
      case 2:
        startPos.set((Math.random() - 0.5) * bounds, -bounds, (Math.random() - 0.5) * bounds);
        endPos.set((Math.random() - 0.5) * bounds, bounds, (Math.random() - 0.5) * bounds);
        break;
      case 3:
        startPos.set((Math.random() - 0.5) * bounds, bounds, (Math.random() - 0.5) * bounds);
        endPos.set((Math.random() - 0.5) * bounds, -bounds, (Math.random() - 0.5) * bounds);
        break;
      case 4:
        startPos.set((Math.random() - 0.5) * bounds, (Math.random() - 0.5) * bounds, -bounds);
        endPos.set((Math.random() - 0.5) * bounds, (Math.random() - 0.5) * bounds, bounds);
        break;
      case 5:
      default:
        startPos.set((Math.random() - 0.5) * bounds, (Math.random() - 0.5) * bounds, bounds);
        endPos.set((Math.random() - 0.5) * bounds, (Math.random() - 0.5) * bounds, -bounds);
        break;
    }

    const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
    const speed = 120 + Math.random() * 80;
    const velocity = direction.multiplyScalar(speed);

    const positions = new Float32Array(TRAIL_POINTS * 3);
    const colors = new Float32Array(TRAIL_POINTS * 3);

    for (let i = 0; i < TRAIL_POINTS; i++) {
      const i3 = i * 3;
      const offset = i * 2;
      positions[i3] = startPos.x - velocity.x * offset * 0.01;
      positions[i3 + 1] = startPos.y - velocity.y * offset * 0.01;
      positions[i3 + 2] = startPos.z - velocity.z * offset * 0.01;

      const alpha = Math.pow(1 - i / TRAIL_POINTS, 1.5);
      colors[i3] = 1.0 * alpha;
      colors[i3 + 1] = 0.95 * alpha;
      colors[i3 + 2] = 0.8 * alpha;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      linewidth: 2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const line = new THREE.Line(geometry, material);
    scene.add(line);

    const meteor: Meteor = {
      id: meteorIdCounter++,
      line,
      velocity: velocity.clone(),
      life: 0,
      maxLife: 2.5 + Math.random() * 1.5,
      trailLength: TRAIL_POINTS,
    };

    meteorsRef.current.push(meteor);
  }, [scene]);

  useFrame((_, delta) => {
    if (!enabled) return;

    lastSpawnRef.current += delta;

    if (lastSpawnRef.current >= 5) {
      lastSpawnRef.current = 0;
      spawnMeteor();
    }

    const toRemove: number[] = [];

    meteorsRef.current.forEach((meteor) => {
      meteor.life += delta;

      if (meteor.life >= meteor.maxLife) {
        toRemove.push(meteor.id);
        return;
      }

      const geometry = meteor.line.geometry;
      const posAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttribute.array as Float32Array;

      for (let i = meteor.trailLength - 1; i > 0; i--) {
        const i3 = i * 3;
        const prev3 = (i - 1) * 3;
        positions[i3] = positions[prev3];
        positions[i3 + 1] = positions[prev3 + 1];
        positions[i3 + 2] = positions[prev3 + 2];
      }

      positions[0] += meteor.velocity.x * delta;
      positions[1] += meteor.velocity.y * delta;
      positions[2] += meteor.velocity.z * delta;

      posAttribute.needsUpdate = true;

      const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;
      const colors = colorAttribute.array as Float32Array;
      const fadeFactor = 1 - Math.pow(meteor.life / meteor.maxLife, 2);

      for (let i = 0; i < meteor.trailLength; i++) {
        const i3 = i * 3;
        const trailFade = Math.pow(1 - i / meteor.trailLength, 1.5);
        const alpha = trailFade * fadeFactor;
        colors[i3] = 1.0 * alpha;
        colors[i3 + 1] = 0.95 * alpha;
        colors[i3 + 2] = 0.8 * alpha;
      }
      colorAttribute.needsUpdate = true;
    });

    if (toRemove.length > 0) {
      meteorsRef.current = meteorsRef.current.filter((meteor) => {
        if (toRemove.includes(meteor.id)) {
          scene.remove(meteor.line);
          meteor.line.geometry.dispose();
          (meteor.line.material as THREE.Material).dispose();
          return false;
        }
        return true;
      });
    }
  });

  useEffect(() => {
    return () => {
      meteorsRef.current.forEach((meteor) => {
        scene.remove(meteor.line);
        meteor.line.geometry.dispose();
        (meteor.line.material as THREE.Material).dispose();
      });
      meteorsRef.current = [];
    };
  }, [scene]);

  return null;
}
