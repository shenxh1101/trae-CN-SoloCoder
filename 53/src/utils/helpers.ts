import * as THREE from 'three';
import { Atom, MoleculeData, MoleculeSize, Bond, ELECTRONEGATIVITY, ATOMIC_WEIGHT } from '../types';

export function calculateDistance(p1: [number, number, number], p2: [number, number, number]): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function calculateMoleculeSize(atoms: Atom[]): MoleculeSize {
  if (atoms.length === 0) {
    return { width: 0, height: 0, depth: 0 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  atoms.forEach((atom) => {
    const [x, y, z] = atom.position;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });

  return {
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  };
}

export function calculateDipoleMoment(atoms: Atom[], bonds: Bond[]): [number, number, number] {
  let totalDipole = [0, 0, 0];
  
  bonds.forEach((bond) => {
    const fromAtom = atoms.find((a) => a.id === bond.from);
    const toAtom = atoms.find((a) => a.id === bond.to);
    
    if (fromAtom && toAtom) {
      const fromElectroneg = ELECTRONEGATIVITY[fromAtom.element];
      const toElectroneg = ELECTRONEGATIVITY[toAtom.element];
      const electronegDiff = toElectroneg - fromElectroneg;
      
      if (Math.abs(electronegDiff) > 0.01) {
        const bondVector: [number, number, number] = [
          toAtom.position[0] - fromAtom.position[0],
          toAtom.position[1] - fromAtom.position[1],
          toAtom.position[2] - fromAtom.position[2],
        ];
        
        const bondLength = Math.sqrt(
          bondVector[0] ** 2 + bondVector[1] ** 2 + bondVector[2] ** 2
        );
        
        if (bondLength > 0) {
          const normalizedVector: [number, number, number] = [
            bondVector[0] / bondLength,
            bondVector[1] / bondLength,
            bondVector[2] / bondLength,
          ];
          
          const bondDipole = electronegDiff * bond.order;
          totalDipole = [
            totalDipole[0] + normalizedVector[0] * bondDipole,
            totalDipole[1] + normalizedVector[1] * bondDipole,
            totalDipole[2] + normalizedVector[2] * bondDipole,
          ];
        }
      }
    }
  });
  
  const magnitude = Math.sqrt(
    totalDipole[0] ** 2 + totalDipole[1] ** 2 + totalDipole[2] ** 2
  );
  
  if (magnitude > 0.01) {
    return [
      totalDipole[0] / magnitude,
      totalDipole[1] / magnitude,
      totalDipole[2] / magnitude,
    ];
  }
  
  return [0, 0, 0];
}

export function calculateCenterOfMass(atoms: Atom[]): [number, number, number] {
  let totalMass = 0;
  let weightedPosition = [0, 0, 0];
  
  atoms.forEach((atom) => {
    const mass = ATOMIC_WEIGHT[atom.element];
    totalMass += mass;
    weightedPosition = [
      weightedPosition[0] + atom.position[0] * mass,
      weightedPosition[1] + atom.position[1] * mass,
      weightedPosition[2] + atom.position[2] * mass,
    ];
  });
  
  if (totalMass > 0) {
    return [
      weightedPosition[0] / totalMass,
      weightedPosition[1] / totalMass,
      weightedPosition[2] / totalMass,
    ];
  }
  
  return [0, 0, 0];
}

export function createBondGeometry(
  start: [number, number, number],
  end: [number, number, number],
  radius: number = 0.1
): THREE.Mesh {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(endVec, startVec);
  const length = direction.length();

  const geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    metalness: 0.8,
    roughness: 0.2,
  });

  const mesh = new THREE.Mesh(geometry, material);

  const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  mesh.position.copy(midPoint);

  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());
  mesh.setRotationFromQuaternion(quaternion);

  return mesh;
}

export function exportPNG(renderer: THREE.WebGLRenderer, filename: string = 'molecule.png'): void {
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function saveMoleculeToJSON(molecule: MoleculeData, filename: string = 'molecule.json'): void {
  const exportData = {
    ...molecule,
    exportTime: new Date().toISOString(),
    version: '1.0',
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function loadMoleculeFromJSON(file: File): Promise<MoleculeData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.atoms || !data.bonds) {
          reject(new Error('无效的分子数据格式'));
          return;
        }
        resolve(data as MoleculeData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

export function getMoleculeCenter(atoms: Atom[]): [number, number, number] {
  if (atoms.length === 0) return [0, 0, 0];

  const sum = atoms.reduce(
    (acc, atom) => [
      acc[0] + atom.position[0],
      acc[1] + atom.position[1],
      acc[2] + atom.position[2],
    ],
    [0, 0, 0]
  );

  return [sum[0] / atoms.length, sum[1] / atoms.length, sum[2] / atoms.length];
}

export function formatNumber(num: number, decimals: number = 3): string {
  return num.toFixed(decimals);
}
