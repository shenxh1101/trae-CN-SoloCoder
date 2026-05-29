import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BeamData, SceneConfig } from '../../types';
import { getTopColor } from '../../utils/colorUtils';

const beamVertexShader = `
  varying vec3 vPosition;
  varying float vHeightRatio;
  varying vec3 vBottomColor;
  varying vec3 vTopColor;
  varying float vPulseOffset;
  varying float vPulseStrength;
  
  attribute vec3 bottomColor;
  attribute vec3 topColor;
  attribute float pulseOffset;
  attribute float pulseStrength;
  
  uniform float uTime;
  uniform float uPulseSpeed;
  
  void main() {
    vPosition = position;
    vHeightRatio = (position.y + 1.0) / 2.0;
    vBottomColor = bottomColor;
    vTopColor = topColor;
    vPulseOffset = pulseOffset;
    vPulseStrength = pulseStrength;
    
    float pulse = sin(uTime * uPulseSpeed + pulseOffset) * 0.5 + 0.5;
    vec3 pos = position;
    pos.y *= 1.0 + pulse * pulseStrength * 0.05;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const beamFragmentShader = `
  varying vec3 vPosition;
  varying float vHeightRatio;
  varying vec3 vBottomColor;
  varying vec3 vTopColor;
  varying float vPulseOffset;
  varying float vPulseStrength;
  
  uniform float uTime;
  uniform float uPulseSpeed;
  uniform float uOpacity;
  
  void main() {
    vec3 color = mix(vBottomColor, vTopColor, vHeightRatio);
    
    float pulse = sin(uTime * uPulseSpeed + vPulseOffset) * 0.5 + 0.5;
    float brightness = 0.6 + pulse * vPulseStrength * 0.4;
    color *= brightness;
    
    float dist = length(vPosition.xz);
    float alpha = (1.0 - dist) * uOpacity;
    alpha *= 0.7 + vHeightRatio * 0.3;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

interface LightBeamsProps {
  beamData: BeamData[];
  config: SceneConfig;
}

export function LightBeams({ beamData, config }: LightBeamsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);

  const { geometry, bottomColorAttr, topColorAttr, pulseOffsetAttr, pulseStrengthAttr } = useMemo(() => {
    const geom = new THREE.CylinderGeometry(1, 1, 2, 12, 1, true);
    geom.translate(0, 1, 0);
    
    const bottomColors = new Float32Array(beamData.length * 3);
    const topColors = new Float32Array(beamData.length * 3);
    const pulseOffsets = new Float32Array(beamData.length);
    const pulseStrengths = new Float32Array(beamData.length);
    
    beamData.forEach((beam, i) => {
      const topColor = getTopColor(beam.color);
      bottomColors[i * 3] = beam.color.r;
      bottomColors[i * 3 + 1] = beam.color.g;
      bottomColors[i * 3 + 2] = beam.color.b;
      topColors[i * 3] = topColor.r;
      topColors[i * 3 + 1] = topColor.g;
      topColors[i * 3 + 2] = topColor.b;
      pulseOffsets[i] = beam.pulseOffset;
      pulseStrengths[i] = beam.pulseStrength;
    });
    
    const bottomColorAttr = new THREE.InstancedBufferAttribute(bottomColors, 3);
    const topColorAttr = new THREE.InstancedBufferAttribute(topColors, 3);
    const pulseOffsetAttr = new THREE.InstancedBufferAttribute(pulseOffsets, 1);
    const pulseStrengthAttr = new THREE.InstancedBufferAttribute(pulseStrengths, 1);
    
    geom.setAttribute('bottomColor', bottomColorAttr);
    geom.setAttribute('topColor', topColorAttr);
    geom.setAttribute('pulseOffset', pulseOffsetAttr);
    geom.setAttribute('pulseStrength', pulseStrengthAttr);
    
    return { geometry: geom, bottomColorAttr, topColorAttr, pulseOffsetAttr, pulseStrengthAttr };
  }, [beamData]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPulseSpeed: { value: config.pulseSpeed },
      uOpacity: { value: 0.7 },
    }),
    []
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: beamVertexShader,
        fragmentShader: beamFragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    [uniforms]
  );

  useEffect(() => {
    if (!meshRef.current) return;

    beamData.forEach((beam, i) => {
      dummy.position.set(beam.x, 0, beam.z);
      dummy.scale.set(config.beamRadius, beam.height, config.beamRadius);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [beamData, config.beamRadius, dummy]);

  useEffect(() => {
    uniforms.uPulseSpeed.value = config.pulseSpeed;
  }, [config.pulseSpeed, uniforms]);

  useEffect(() => {
    if (!bottomColorAttr || !topColorAttr || !pulseOffsetAttr || !pulseStrengthAttr) return;
    
    beamData.forEach((beam, i) => {
      const topColor = getTopColor(beam.color);
      bottomColorAttr.setXYZ(i, beam.color.r, beam.color.g, beam.color.b);
      topColorAttr.setXYZ(i, topColor.r, topColor.g, topColor.b);
      pulseOffsetAttr.setX(i, beam.pulseOffset);
      pulseStrengthAttr.setX(i, beam.pulseStrength);
    });
    
    bottomColorAttr.needsUpdate = true;
    topColorAttr.needsUpdate = true;
    pulseOffsetAttr.needsUpdate = true;
    pulseStrengthAttr.needsUpdate = true;
  }, [beamData, bottomColorAttr, topColorAttr, pulseOffsetAttr, pulseStrengthAttr]);

  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime;
    uniforms.uTime.value = timeRef.current;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, beamData.length]}
      frustumCulled={false}
    />
  );
}
