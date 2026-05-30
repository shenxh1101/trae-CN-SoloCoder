import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CreatureGenome } from '../../types/creature';
import { CreaturePart } from './CreaturePart';
import { useCreatureAnimation } from '../../hooks/useCreatureAnimation';

interface CreatureProps {
  genome: CreatureGenome;
  animationEnabled: boolean;
  isEvolving: boolean;
  feedbackEffect: 'like' | 'dislike' | null;
  onPartClick: (type: string) => void;
  onGroupReady: (group: THREE.Group | null) => void;
}

export function Creature({
  genome,
  animationEnabled,
  isEvolving,
  feedbackEffect,
  onPartClick,
  onGroupReady,
}: CreatureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const feedbackRingRef = useRef<THREE.Mesh>(null);

  const { registerPart } = useCreatureAnimation({
    groupRef,
    animationEnabled,
    isEvolving,
  });

  useEffect(() => {
    onGroupReady(groupRef.current);
    return () => onGroupReady(null);
  }, [onGroupReady]);

  useEffect(() => {
    if (!feedbackRingRef.current) return;

    const ring = feedbackRingRef.current;
    const ringMat = ring.material as THREE.MeshBasicMaterial;

    if (feedbackEffect === 'like') {
      ringMat.color.set('#10b981');
      ringMat.opacity = 0.8;
      ring.scale.setScalar(0.5);
      animateRing(ring, 1.5, 0);
    } else if (feedbackEffect === 'dislike') {
      ringMat.color.set('#ef4444');
      ringMat.opacity = 0.8;
      ring.scale.setScalar(0.5);
      animateRing(ring, 1.5, 0);
    }
  }, [feedbackEffect]);

  const animateRing = (ring: THREE.Mesh, targetScale: number, targetOpacity: number) => {
    const startScale = ring.scale.x;
    const startOpacity = (ring.material as THREE.MeshBasicMaterial).opacity;
    const duration = 600;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      ring.scale.setScalar(startScale + (targetScale - startScale) * eased);
      (ring.material as THREE.MeshBasicMaterial).opacity =
        startOpacity + (targetOpacity - startOpacity) * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  return (
    <group ref={groupRef}>
      {genome.parts.map((part, index) => (
        <CreaturePart
          key={`${part.type}-${index}`}
          part={part}
          onPartClick={onPartClick}
          registerPart={registerPart}
        />
      ))}

      <mesh ref={feedbackRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <ringGeometry args={[2, 2.2, 64]} />
        <meshBasicMaterial transparent opacity={0} side={2} />
      </mesh>
    </group>
  );
}
