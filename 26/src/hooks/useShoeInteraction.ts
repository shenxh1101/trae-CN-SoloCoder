import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useConfigStore, useHistoryStore } from '@/store/useConfigStore';
import type { ShoePart } from '@/types';
import { SHOE_PARTS_INFO } from '@/types';

interface UseShoeInteractionOptions {
  onPartClick?: (part: ShoePart) => void;
  onPartHover?: (part: ShoePart | null) => void;
}

export const useShoeInteraction = (options: UseShoeInteractionOptions = {}) => {
  const { selectedPart, setSelectedPart } = useConfigStore();
  const { pushHistory } = useHistoryStore();
  const { scene, camera, raycaster, pointer } = useThree();
  const hoveredPart = useRef<ShoePart | null>(null);
  const previousConfig = useRef(useConfigStore.getState().config);

  const getShoeMeshes = useCallback(() => {
    const meshes: { mesh: THREE.Mesh; partName: ShoePart }[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.partName) {
        meshes.push({
          mesh: object,
          partName: object.userData.partName as ShoePart
        });
      }
    });
    return meshes;
  }, [scene]);

  const handlePointerMove = useCallback(
    (event: any) => {
      const meshes = getShoeMeshes();
      const intersects = raycaster.intersectObjects(
        meshes.map((m) => m.mesh),
        true
      );

      if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object as THREE.Mesh;
        const partName = intersectedMesh.userData.partName as ShoePart;

        if (hoveredPart.current !== partName) {
          hoveredPart.current = partName;
          document.body.style.cursor = 'pointer';
          options.onPartHover?.(partName);
        }
      } else if (hoveredPart.current !== null) {
        hoveredPart.current = null;
        document.body.style.cursor = 'auto';
        options.onPartHover?.(null);
      }
    },
    [getShoeMeshes, raycaster, options]
  );

  const handleClick = useCallback(
    (event: any) => {
      const meshes = getShoeMeshes();
      const intersects = raycaster.intersectObjects(
        meshes.map((m) => m.mesh),
        true
      );

      if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object as THREE.Mesh;
        const partName = intersectedMesh.userData.partName as ShoePart;

        const currentConfig = useConfigStore.getState().config;
        if (previousConfig.current.id === currentConfig.id) {
          pushHistory(previousConfig.current);
        }
        previousConfig.current = JSON.parse(JSON.stringify(currentConfig));

        setSelectedPart(partName);
        options.onPartClick?.(partName);
      }
    },
    [getShoeMeshes, raycaster, setSelectedPart, pushHistory, options]
  );

  useEffect(() => {
    const currentConfig = useConfigStore.getState().config;
    const unsubscribe = useConfigStore.subscribe((state) => {
      if (state.config.updatedAt !== currentConfig.updatedAt) {
        pushHistory(currentConfig);
      }
    });

    return unsubscribe;
  }, [pushHistory]);

  const getPartInfo = useCallback((part: ShoePart) => {
    return SHOE_PARTS_INFO[part];
  }, []);

  const getHighlightedMeshes = useCallback(() => {
    const meshes = getShoeMeshes();
    return meshes.filter(
      (m) => m.partName === selectedPart || m.partName === hoveredPart.current
    );
  }, [getShoeMeshes, selectedPart]);

  return {
    handlePointerMove,
    handleClick,
    hoveredPart: hoveredPart.current,
    getPartInfo,
    getHighlightedMeshes
  };
};
