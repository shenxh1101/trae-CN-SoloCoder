import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BubbleData, SCENE_CONSTANTS } from '../../utils/constants';

interface ConnectionsProps {
  bubbles: BubbleData[];
  enabled: boolean;
}

export default function Connections({ bubbles, enabled }: ConnectionsProps) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const maxConnections = 2000;

  const positions = useMemo(() => {
    return new Float32Array(maxConnections * 6);
  }, []);

  const colors = useMemo(() => {
    return new Float32Array(maxConnections * 6);
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  useFrame(() => {
    if (!enabled || !lineRef.current) {
      if (lineRef.current) {
        lineRef.current.geometry.setDrawRange(0, 0);
      }
      return;
    }

    const { CONNECTION_DISTANCE } = SCENE_CONSTANTS;
    let connectionCount = 0;
    const color = new THREE.Color();

    for (let i = 0; i < bubbles.length && connectionCount < maxConnections; i++) {
      for (let j = i + 1; j < bubbles.length && connectionCount < maxConnections; j++) {
        const b1 = bubbles[i];
        const b2 = bubbles[j];

        const dx = b1.position[0] - b2.position[0];
        const dy = b1.position[1] - b2.position[1];
        const dz = b1.position[2] - b2.position[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < CONNECTION_DISTANCE) {
          const opacity = 1 - distance / CONNECTION_DISTANCE;
          const alpha = opacity * 0.5;

          color.set(b1.color);
          const idx = connectionCount * 6;

          positions[idx] = b1.position[0];
          positions[idx + 1] = b1.position[1];
          positions[idx + 2] = b1.position[2];
          colors[idx] = color.r * alpha;
          colors[idx + 1] = color.g * alpha;
          colors[idx + 2] = color.b * alpha;

          positions[idx + 3] = b2.position[0];
          positions[idx + 4] = b2.position[1];
          positions[idx + 5] = b2.position[2];
          color.set(b2.color);
          colors[idx + 3] = color.r * alpha;
          colors[idx + 4] = color.g * alpha;
          colors[idx + 5] = color.b * alpha;

          connectionCount++;
        }
      }
    }

    lineRef.current.geometry.setDrawRange(0, connectionCount * 2);
    lineRef.current.geometry.attributes.position.needsUpdate = true;
    lineRef.current.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.6} />
    </lineSegments>
  );
}
