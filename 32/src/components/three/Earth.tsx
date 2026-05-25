import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';
import Cities from './Cities';
import GridHelper from './GridHelper';

const earthVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const earthFragmentShader = `
uniform sampler2D earthTexture;
uniform sampler2D nightTexture;
uniform vec3 sunDirection;
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  vec4 dayColor = texture2D(earthTexture, vUv);
  vec4 nightColor = texture2D(nightTexture, vUv);
  float intensity = dot(vNormal, normalize(sunDirection));
  float transition = smoothstep(-0.15, 0.15, intensity);
  vec3 color = mix(nightColor.rgb * 1.2, dayColor.rgb, transition);
  gl_FragColor = vec4(color, 1.0);
}
`;

const atmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const atmosphereFragmentShader = `
uniform vec3 sunDirection;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
  float sunIntensity = max(dot(vNormal, normalize(sunDirection)), 0.0);
  vec3 atmosphereColor = vec3(0.3, 0.6, 1.0) * intensity * (0.5 + sunIntensity * 0.5);
  gl_FragColor = vec4(atmosphereColor, intensity * 0.8);
}
`;

export default function Earth({ earthRef }: { earthRef: React.MutableRefObject<THREE.Group | null> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const rotationSpeed = useSceneStore((state) => state.rotationSpeed);
  const sunPosition = useSceneStore((state) => state.sunPosition);
  const sunDirection = useMemo(() => new THREE.Vector3(), []);

  const [earthTexture, nightTexture] = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const earthTex = loader.load('https://unpkg.com/three-globe@2.24.13/example/img/earth-blue-marble.jpg');
    earthTex.colorSpace = THREE.SRGBColorSpace;
    const nightTex = loader.load('https://unpkg.com/three-globe@2.24.13/example/img/earth-night-lights.jpg');
    nightTex.colorSpace = THREE.SRGBColorSpace;
    return [earthTex, nightTex];
  }, []);

  const earthMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const atmosphereMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;
    }

    sunDirection.set(sunPosition.x, sunPosition.y, sunPosition.z).normalize();

    if (earthMaterialRef.current) {
      earthMaterialRef.current.uniforms.sunDirection.value.copy(sunDirection);
    }
    if (atmosphereMaterialRef.current) {
      atmosphereMaterialRef.current.uniforms.sunDirection.value.copy(sunDirection);
    }
  });

  return (
    <group ref={(node) => {
      groupRef.current = node;
      if (earthRef) earthRef.current = node;
    }}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.98, 64, 64]} />
        <shaderMaterial
          ref={(mat) => { earthMaterialRef.current = mat as THREE.ShaderMaterial; }}
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={{
            earthTexture: { value: earthTexture },
            nightTexture: { value: nightTexture },
            sunDirection: { value: sunDirection },
          }}
        />
      </mesh>
      <Cities />
      <GridHelper />
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[2.1, 64, 64]} />
        <shaderMaterial
          ref={(mat) => { atmosphereMaterialRef.current = mat as THREE.ShaderMaterial; }}
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={{
            sunDirection: { value: sunDirection },
          }}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
