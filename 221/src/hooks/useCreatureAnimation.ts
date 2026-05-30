import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BodyPartType } from '../types/creature';
import { ANIMATABLE_PARTS, ANIMATION_CONFIG } from '../constants/creatureConfig';

interface UseCreatureAnimationProps {
  groupRef: React.RefObject<THREE.Group>;
  animationEnabled: boolean;
  isEvolving: boolean;
}

export function useCreatureAnimation({
  groupRef,
  animationEnabled,
  isEvolving,
}: UseCreatureAnimationProps) {
  const timeRef = useRef(0);
  const partRefs = useRef<Map<BodyPartType, THREE.Object3D>>(new Map());
  const prevAnimationEnabled = useRef(animationEnabled);

  const registerPart = (type: BodyPartType, obj: THREE.Object3D | null) => {
    if (obj) {
      partRefs.current.set(type, obj);
    } else {
      partRefs.current.delete(type);
    }
  };

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    timeRef.current += delta;
    const time = timeRef.current;

    if (isEvolving) {
      const scale = Math.max(0.01, Math.abs(Math.sin(time * 8)) * 0.3);
      groupRef.current.scale.setScalar(scale);
      return;
    }

    groupRef.current.scale.setScalar(1);

    if (!animationEnabled && prevAnimationEnabled.current) {
      groupRef.current.position.y = 0;
      ANIMATABLE_PARTS.forEach((partType) => {
        const part = partRefs.current.get(partType);
        if (part) {
          part.rotation.x = 0;
          part.rotation.y = 0;
          part.rotation.z = 0;
        }
      });
    }

    prevAnimationEnabled.current = animationEnabled;

    if (animationEnabled) {
      const floatOffset =
        Math.sin(time * ANIMATION_CONFIG.floatFrequency) * ANIMATION_CONFIG.floatAmplitude;
      groupRef.current.position.y = floatOffset;

      ANIMATABLE_PARTS.forEach((partType, index) => {
        const part = partRefs.current.get(partType);
        if (!part) return;

        const phaseOffset = (index * Math.PI) / 3;
        const swing =
          Math.sin(time * ANIMATION_CONFIG.swingFrequency + phaseOffset) *
          ANIMATION_CONFIG.swingAmplitude;

        if (partType.startsWith('arm')) {
          part.rotation.x = swing;
        } else if (partType.startsWith('leg')) {
          part.rotation.x = -swing;
        } else if (partType === 'tail') {
          part.rotation.z = swing * 0.5;
        }
      });
    }
  });

  return { registerPart };
}
