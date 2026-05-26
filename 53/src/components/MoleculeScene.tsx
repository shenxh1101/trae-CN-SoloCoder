import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {
  MoleculeData,
  DisplayOptions,
  BackgroundType,
  ELEMENT_COLORS,
  ELEMENT_RADIUS,
  VAN_DER_WAALS_RADIUS,
  ELEMENT_NAMES,
  MeasurementResult,
} from '../types';
import {
  createBondGeometry,
  getMoleculeCenter,
  calculateDipoleMoment,
} from '../utils/helpers';

interface MoleculeSceneProps {
  molecule: MoleculeData | null;
  displayOptions: DisplayOptions;
  background: BackgroundType;
  onAtomClick: (atomId: string) => void;
  onAtomHover: (atomId: string | null) => void;
  selectedAtoms: string[];
  measurementResult: MeasurementResult | null;
  onRendererReady?: (renderer: THREE.WebGLRenderer) => void;
}

export default function MoleculeScene({
  molecule,
  displayOptions,
  background,
  onAtomClick,
  onAtomHover,
  selectedAtoms,
  measurementResult,
  onRendererReady,
}: MoleculeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const moleculeGroupRef = useRef<THREE.Group | null>(null);
  const atomMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const animationIdRef = useRef<number>(0);
  const electronCloudMaterialsRef = useRef<THREE.ShaderMaterial[]>([]);
  const timeRef = useRef<number>(0);

  const electronCloudShader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x4488ff) },
      uOpacity: { value: 0.6 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
      }
      
      void main() {
        float dist = length(vPosition);
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
        
        float n = noise(vPosition * 3.0 + uTime * 0.5);
        float pulse = sin(uTime * 2.0 + dist * 5.0) * 0.5 + 0.5;
        
        float alpha = fresnel * 0.8 + pulse * 0.2;
        alpha *= uOpacity * (1.0 - dist * 0.3);
        alpha = clamp(alpha, 0.0, 0.5);
        
        vec3 finalColor = uColor + vec3(n * 0.1);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
  }), []);

  const setBackground = useCallback((bg: BackgroundType) => {
    if (!sceneRef.current) return;
    switch (bg) {
      case 'white':
        sceneRef.current.background = new THREE.Color(0xffffff);
        break;
      case 'black':
        sceneRef.current.background = new THREE.Color(0x0a0a0a);
        break;
      case 'gradient': {
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const gradient = ctx.createLinearGradient(0, 0, 0, 512);
          gradient.addColorStop(0, '#1a1a2e');
          gradient.addColorStop(0.5, '#16213e');
          gradient.addColorStop(1, '#0f3460');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 2, 512);
        }
        const texture = new THREE.CanvasTexture(canvas);
        sceneRef.current.background = texture;
        break;
      }
    }
  }, []);

  const clearMolecule = useCallback(() => {
    if (moleculeGroupRef.current && sceneRef.current) {
      moleculeGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      while (moleculeGroupRef.current.children.length > 0) {
        moleculeGroupRef.current.remove(moleculeGroupRef.current.children[0]);
      }
      sceneRef.current.remove(moleculeGroupRef.current);
    }
    atomMeshesRef.current.clear();
    electronCloudMaterialsRef.current = [];
  }, []);

  const createElectronCloud = useCallback(
    (position: [number, number, number], radius: number, color: string) => {
      const geometry = new THREE.SphereGeometry(radius * 1.5, 32, 32);
      const material = new THREE.ShaderMaterial({
        ...electronCloudShader,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: 0.5 },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      electronCloudMaterialsRef.current.push(material);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.userData = { isElectronCloud: true };
      return mesh;
    },
    [electronCloudShader]
  );

  const buildMolecule = useCallback(
    (data: MoleculeData) => {
      clearMolecule();

      const group = new THREE.Group();
      moleculeGroupRef.current = group;

      const atomMap = new Map<string, THREE.Mesh>();

      const dipoleDirection = data.dipoleMoment || calculateDipoleMoment(data.atoms, data.bonds);

      data.atoms.forEach((atom) => {
        const radius = ELEMENT_RADIUS[atom.element];
        const color = ELEMENT_COLORS[atom.element];

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.4,
          roughness: 0.15,
          envMapIntensity: 1.0,
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(...atom.position);
        sphere.userData = { atomId: atom.id, element: atom.element, originalColor: color };
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        group.add(sphere);
        atomMap.set(atom.id, sphere);

        if (displayOptions.showLabels) {
          const labelDiv = document.createElement('div');
          labelDiv.className =
            'atom-label px-2 py-1 rounded text-xs font-bold pointer-events-none transition-all duration-200';
          labelDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
          labelDiv.style.color = color;
          labelDiv.style.border = `1px solid ${color}`;
          labelDiv.style.boxShadow = `0 0 8px ${color}40`;
          labelDiv.textContent = `${ELEMENT_NAMES[atom.element]}(${atom.element})`;
          const label = new CSS2DObject(labelDiv);
          label.position.set(atom.position[0], atom.position[1] + radius + 0.4, atom.position[2]);
          group.add(label);
        }

        if (displayOptions.showVanDerWaals) {
          const vdwRadius = VAN_DER_WAALS_RADIUS[atom.element];
          const vdwGeometry = new THREE.SphereGeometry(vdwRadius, 32, 32);
          const vdwMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const vdwSphere = new THREE.Mesh(vdwGeometry, vdwMaterial);
          vdwSphere.position.set(...atom.position);
          vdwSphere.userData = { isVanDerWaals: true };
          group.add(vdwSphere);
        }

        if (displayOptions.showElectronCloud) {
          const electronCloud = createElectronCloud(atom.position, radius, color);
          group.add(electronCloud);
        }
      });

      data.bonds.forEach((bond) => {
        const fromAtom = data.atoms.find((a) => a.id === bond.from);
        const toAtom = data.atoms.find((a) => a.id === bond.to);
        if (fromAtom && toAtom) {
          const bondMesh = createBondGeometry(
            fromAtom.position,
            toAtom.position,
            0.08 * bond.order
          );
          bondMesh.userData = { isBond: true, bondOrder: bond.order };
          group.add(bondMesh);

          if (bond.order > 1) {
            const offset = 0.12;
            const direction = new THREE.Vector3(
              toAtom.position[0] - fromAtom.position[0],
              toAtom.position[1] - fromAtom.position[1],
              toAtom.position[2] - fromAtom.position[2]
            ).normalize();
            
            const perpendicular = new THREE.Vector3(0, 1, 0);
            if (Math.abs(direction.dot(perpendicular)) > 0.9) {
              perpendicular.set(1, 0, 0);
            }
            perpendicular.cross(direction).normalize();

            for (let i = 1; i < bond.order; i++) {
              const offsetDistance = offset * (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2);
              const fromOffset: [number, number, number] = [
                fromAtom.position[0] + perpendicular.x * offsetDistance,
                fromAtom.position[1] + perpendicular.y * offsetDistance,
                fromAtom.position[2] + perpendicular.z * offsetDistance,
              ];
              const toOffset: [number, number, number] = [
                toAtom.position[0] + perpendicular.x * offsetDistance,
                toAtom.position[1] + perpendicular.y * offsetDistance,
                toAtom.position[2] + perpendicular.z * offsetDistance,
              ];
              const extraBond = createBondGeometry(fromOffset, toOffset, 0.06);
              extraBond.userData = { isBond: true };
              group.add(extraBond);
            }
          }
        }
      });

      if (displayOptions.showDipoleMoment) {
        const [dx, dy, dz] = dipoleDirection;
        const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (magnitude > 0.01) {
          const arrowLength = 1.5;
          const arrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3(dx, dy, dz).normalize(),
            new THREE.Vector3(0, 0, 0),
            arrowLength,
            0xffff00,
            0.4,
            0.2
          );
          arrowHelper.userData = { isDipoleArrow: true };
          group.add(arrowHelper);

          const dipoleLabelDiv = document.createElement('div');
          dipoleLabelDiv.className = 'dipole-label px-2 py-1 rounded text-xs font-bold pointer-events-none';
          dipoleLabelDiv.style.backgroundColor = 'rgba(255, 255, 0, 0.9)';
          dipoleLabelDiv.style.color = '#000';
          dipoleLabelDiv.textContent = 'μ (偶极矩)';
          const dipoleLabel = new CSS2DObject(dipoleLabelDiv);
          dipoleLabel.position.set(dx * arrowLength + 0.3, dy * arrowLength + 0.3, dz * arrowLength + 0.3);
          group.add(dipoleLabel);
        }
      }

      if (measurementResult) {
        const atom1 = data.atoms.find((a) => a.id === measurementResult.atom1);
        const atom2 = data.atoms.find((a) => a.id === measurementResult.atom2);
        if (atom1 && atom2) {
          const midPoint: [number, number, number] = [
            (atom1.position[0] + atom2.position[0]) / 2,
            (atom1.position[1] + atom2.position[1]) / 2,
            (atom1.position[2] + atom2.position[2]) / 2,
          ];
          const labelDiv = document.createElement('div');
          labelDiv.className = 'bond-measurement px-3 py-1.5 rounded text-sm font-bold pointer-events-none';
          labelDiv.style.backgroundColor = 'rgba(255, 215, 0, 0.95)';
          labelDiv.style.color = '#000';
          labelDiv.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.5)';
          labelDiv.textContent = `${measurementResult.distance.toFixed(3)} Å`;
          const label = new CSS2DObject(labelDiv);
          label.position.set(...midPoint);
          group.add(label);

          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...atom1.position),
            new THREE.Vector3(...atom2.position),
          ]);
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 3 });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData = { isMeasurementLine: true };
          group.add(line);
        }
      }

      selectedAtoms.forEach((atomId) => {
        const atom = data.atoms.find((a) => a.id === atomId);
        if (atom) {
          const atomRadius = ELEMENT_RADIUS[atom.element];
          const ringGeometry = new THREE.TorusGeometry(atomRadius + 0.15, 0.08, 16, 48);
          const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.9,
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.position.set(...atom.position);
          ring.userData = { isSelectionRing: true };
          group.add(ring);

          const glowGeometry = new THREE.SphereGeometry(atomRadius * 1.1, 32, 32);
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide,
          });
          const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
          glowMesh.position.set(...atom.position);
          glowMesh.userData = { isSelectionGlow: true };
          group.add(glowMesh);
        }
      });

      atomMeshesRef.current = atomMap;
      sceneRef.current?.add(group);

      const center = getMoleculeCenter(data.atoms);
      group.position.set(-center[0], -center[1], -center[2]);
    },
    [clearMolecule, displayOptions, measurementResult, selectedAtoms, createElectronCloud]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 3, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    onRendererReady?.(renderer);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    containerRef.current.appendChild(labelRenderer.domElement);
    labelRendererRef.current = labelRenderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.enablePan = true;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight1.position.set(5, 5, 5);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 1024;
    directionalLight1.shadow.mapSize.height = 1024;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x8888ff, 0.4);
    directionalLight2.position.set(-5, 3, -5);
    scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0xff8888, 0.3, 10);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    setBackground(background);

    const clock = new THREE.Clock();

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      timeRef.current += delta;

      if (displayOptions.autoRotate && moleculeGroupRef.current) {
        moleculeGroupRef.current.rotation.y += 0.005;
      }

      if (displayOptions.showElectronCloud) {
        electronCloudMaterialsRef.current.forEach((material) => {
          material.uniforms.uTime.value = timeRef.current;
        });
      }

      if (moleculeGroupRef.current) {
        moleculeGroupRef.current.children.forEach((child) => {
          if (child.userData.isElectronCloud) {
            child.rotation.y += 0.002;
            child.rotation.x += 0.001;
          }
        });
      }

      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
      containerRef.current?.removeChild(labelRenderer.domElement);
    };
  }, []);

  useEffect(() => {
    setBackground(background);
  }, [background, setBackground]);

  useEffect(() => {
    if (molecule) {
      buildMolecule(molecule);
    }
  }, [molecule, buildMolecule]);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const atomMeshes = Array.from(atomMeshesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(atomMeshes);

      if (intersects.length > 0) {
        const atomId = intersects[0].object.userData.atomId;
        onAtomHover(atomId);
        containerRef.current.style.cursor = 'pointer';

        atomMeshes.forEach((mesh) => {
          if (mesh.userData.atomId === atomId) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.emissive = new THREE.Color(0x333333);
          } else if (!selectedAtoms.includes(mesh.userData.atomId)) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.emissive = new THREE.Color(0x000000);
          }
        });
      } else {
        onAtomHover(null);
        containerRef.current.style.cursor = 'default';

        atomMeshes.forEach((mesh) => {
          if (!selectedAtoms.includes(mesh.userData.atomId)) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.emissive = new THREE.Color(0x000000);
          }
        });
      }
    },
    [onAtomHover, selectedAtoms]
  );

  const handleClick = useCallback(() => {
    if (!cameraRef.current) return;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const atomMeshes = Array.from(atomMeshesRef.current.values());
    const intersects = raycasterRef.current.intersectObjects(atomMeshes);

    if (intersects.length > 0) {
      const atomId = intersects[0].object.userData.atomId;
      onAtomClick(atomId);
    }
  }, [onAtomClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
    };
  }, [handleMouseMove, handleClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ touchAction: 'none' }}
    />
  );
}
