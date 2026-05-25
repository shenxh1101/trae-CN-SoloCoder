import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useConfigStore, useHistoryStore } from '@/store/useConfigStore';
import { useShoeGeometries, createLacesGeometry, createSoleTreadGeometry, createStitchingLines } from './ShoeParts';
import { getMaterialPreset } from '@/utils/materialPresets';
import { generateTexture, generateNormalMap } from '@/utils/textureGenerator';
import type { ShoePart, PartConfig, MaterialType, TexturePattern, ShoeConfig } from '@/types';

interface ShoeModelProps {
  isDefault?: boolean;
  customConfig?: ShoeConfig;
}

interface PartMeshProps {
  geometry: THREE.BufferGeometry;
  partName: ShoePart;
  config: PartConfig;
  isSelected: boolean;
  isHovered: boolean;
}

const PartMesh = ({ geometry, partName, config, isSelected, isHovered }: PartMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.Mesh>(null);
  const outlineGeometry = useMemo(() => {
    const geo = geometry.clone();
    geo.scale(1.03, 1.03, 1.03);
    return geo;
  }, [geometry]);

  const material = useMemo(() => {
    const preset = getMaterialPreset(config.material as MaterialType);
    const texture = generateTexture(config.texture as TexturePattern, config.color);
    const normalMap = config.texture !== 'solid' ? generateNormalMap(texture, 0.3) : null;

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color),
      map: texture,
      normalMap: normalMap,
      normalScale: normalMap ? new THREE.Vector2(preset.normalScale || 0.1, preset.normalScale || 0.1) : undefined,
      roughness: preset.roughness,
      metalness: preset.metalness,
      envMapIntensity: preset.envMapIntensity,
      transparent: preset.transparent || false,
      opacity: preset.opacity || 1,
      side: THREE.DoubleSide
    });

    return mat;
  }, [config.color, config.material, config.texture]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material = material;
      meshRef.current.userData.partName = partName;
    }
  }, [material, partName]);

  useFrame(() => {
    if (outlineRef.current) {
      const visible = isSelected || isHovered;
      outlineRef.current.visible = visible;

      if (visible) {
        const color = isSelected ? '#00d4ff' : '#ffffff';
        (outlineRef.current.material as THREE.MeshBasicMaterial).color.set(color);
        (outlineRef.current.material as THREE.MeshBasicMaterial).opacity = isSelected ? 0.6 : 0.3;
      }
    }
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} userData={{ partName }} />
      <mesh ref={outlineRef} geometry={outlineGeometry} visible={false}>
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.5}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};

const LacesGroup = ({ config, isSelected, isHovered }: {
  config: PartConfig;
  isSelected: boolean;
  isHovered: boolean;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const outlineRef = useRef<THREE.Mesh>(null);

  const lacesGroup = useMemo(() => createLacesGeometry(), []);

  const material = useMemo(() => {
    const preset = getMaterialPreset(config.material as MaterialType);
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color),
      roughness: preset.roughness,
      metalness: preset.metalness,
      envMapIntensity: preset.envMapIntensity
    });
  }, [config.color, config.material]);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry.type !== 'CylinderGeometry') {
          child.material = material;
          child.userData.partName = 'laces';
        }
      });
    }
  }, [material]);

  useFrame(() => {
    if (outlineRef.current) {
      const visible = isSelected || isHovered;
      outlineRef.current.visible = visible;

      if (visible) {
        const color = isSelected ? '#00d4ff' : '#ffffff';
        (outlineRef.current.material as THREE.MeshBasicMaterial).color.set(color);
        (outlineRef.current.material as THREE.MeshBasicMaterial).opacity = isSelected ? 0.6 : 0.3;
      }
    }
  });

  const outlineBox = useMemo(() => {
    const box = new THREE.Box3().setFromObject(lacesGroup);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    
    const geometry = new THREE.BoxGeometry(
      size.x * 1.05,
      size.y * 1.05,
      size.z * 1.05
    );
    geometry.translate(center.x, center.y, center.z);
    
    return geometry;
  }, [lacesGroup]);

  return (
    <group>
      <primitive ref={groupRef} object={lacesGroup} />
      <mesh ref={outlineRef} geometry={outlineBox} visible={false}>
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.5}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};

const SoleTread = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => createSoleTreadGeometry(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.9,
    metalness: 0.1
  }), []);

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} userData={{ partName: 'sole' }} />
  );
};

export const ShoeModel = ({ isDefault = false, customConfig }: ShoeModelProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredPart, setHoveredPart] = useState<ShoePart | null>(null);
  const geometries = useShoeGeometries();

  const storeConfig = useConfigStore((state) => state.config);
  const selectedPart = useConfigStore((state) => state.selectedPart);
  const setSelectedPart = useConfigStore((state) => state.setSelectedPart);
  const { pushHistory } = useHistoryStore.getState();

  const config = isDefault && customConfig ? customConfig : storeConfig;
  const stitchingLines = useMemo(() => createStitchingLines(), []);

  const partConfigs = useMemo(() => ({
    upper: config.parts.upper,
    sole: config.parts.sole,
    logo: config.parts.logo,
    heel: config.parts.heel,
    tongue: config.parts.tongue,
    lining: config.parts.lining,
    laces: config.parts.laces
  }), [config.parts]);

  const handlePointerMove = (event: any) => {
    event.stopPropagation();
    const intersects = event.intersects;

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const partName = mesh.userData.partName as ShoePart;
      if (partName && partName !== hoveredPart) {
        setHoveredPart(partName);
        document.body.style.cursor = 'pointer';
      }
    } else if (hoveredPart !== null) {
      setHoveredPart(null);
      document.body.style.cursor = 'auto';
    }
  };

  const handleClick = (event: any) => {
    event.stopPropagation();
    if (isDefault) return;

    const intersects = event.intersects;
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const partName = mesh.userData.partName as ShoePart;
      if (partName) {
        pushHistory(useConfigStore.getState().config);
        setSelectedPart(partName);
      }
    }
  };

  useFrame((state, delta) => {
    if (groupRef.current && isDefault) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  const renderPart = (partName: ShoePart, geometry: THREE.BufferGeometry) => {
    const partConfig = partConfigs[partName];
    const isSelected = !isDefault && selectedPart === partName;
    const isHovered = !isDefault && hoveredPart === partName;

    return (
      <PartMesh
        key={partName}
        geometry={geometry}
        partName={partName}
        config={partConfig}
        isSelected={isSelected}
        isHovered={isHovered}
      />
    );
  };

  return (
    <group
      ref={groupRef}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      onPointerOut={() => {
        setHoveredPart(null);
        document.body.style.cursor = 'auto';
      }}
    >
      {renderPart('lining', geometries.lining)}
      {renderPart('sole', geometries.sole)}
      <SoleTread />
      {renderPart('upper', geometries.upper)}
      {renderPart('tongue', geometries.tongue)}
      {renderPart('heel', geometries.heel)}
      <LacesGroup
        config={partConfigs.laces}
        isSelected={!isDefault && selectedPart === 'laces'}
        isHovered={!isDefault && hoveredPart === 'laces'}
      />
      {renderPart('logo', geometries.logo)}
      {!isDefault && <primitive object={stitchingLines} />}
    </group>
  );
};

export default ShoeModel;
