import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { useMemo } from 'react';

export const createUpperGeometry = (): THREE.BufferGeometry => {
  const shape = new THREE.Shape();

  const points = [
    [0.85, 0.08], [1.3, 0.12], [1.7, 0.22], [1.9, 0.38],
    [1.95, 0.55], [1.85, 0.78], [1.65, 0.98], [1.35, 1.12],
    [1.0, 1.2], [0.6, 1.23], [0.2, 1.22], [-0.2, 1.18],
    [-0.5, 1.1], [-0.7, 0.98], [-0.8, 0.82], [-0.82, 0.65],
    [-0.75, 0.48], [-0.62, 0.32], [-0.45, 0.22], [-0.25, 0.15],
    [0.0, 0.12], [0.4, 0.09], [0.85, 0.08]
  ];

  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev[0] + curr[0]) / 2;
    const cpy = (prev[1] + curr[1]) / 2 + Math.sin(i * 0.5) * 0.01;
    shape.quadraticCurveTo(cpx, cpy, curr[0], curr[1]);
  }

  const extrudeSettings = {
    steps: 16,
    depth: 0.9,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelOffset: 0,
    bevelSegments: 6,
    curveSegments: 12
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(0, 0.25, 0);

  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    
    const zFactor = 1 - Math.abs(vertex.z) * 0.35;
    vertex.y *= zFactor;
    
    const xNorm = vertex.x / 2;
    const yNorm = vertex.y / 1.2;
    const archCurve = Math.sin(xNorm * Math.PI) * 0.08 * Math.max(0, yNorm);
    vertex.y += archCurve;
    
    const sideCurve = Math.sin(vertex.z * 3) * 0.03 * Math.max(0, 1 - Math.abs(xNorm));
    vertex.y += sideCurve;
    
    const toeBump = Math.max(0, (vertex.x - 0.5) / 1.5) * Math.sin(vertex.z * 2) * 0.04;
    vertex.y += toeBump;
    
    const heelCurve = Math.max(0, (-vertex.x - 0.3) / 0.5) * 0.06;
    vertex.y += heelCurve;
    
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  return geometry;
};

export const createSoleGeometry = (): THREE.BufferGeometry => {
  const shape = new THREE.Shape();

  const solePoints = [
    [0.9, 0], [1.35, 0.03], [1.75, 0.1], [1.95, 0.2],
    [1.98, 0.35], [1.85, 0.5], [1.6, 0.6], [1.2, 0.65],
    [0.7, 0.66], [0.2, 0.65], [-0.25, 0.63], [-0.6, 0.58],
    [-0.8, 0.48], [-0.88, 0.35], [-0.85, 0.2], [-0.7, 0.08],
    [-0.4, 0.02], [0.0, 0], [0.45, 0], [0.9, 0]
  ];

  shape.moveTo(solePoints[0][0], solePoints[0][1]);
  for (let i = 1; i < solePoints.length; i++) {
    const prev = solePoints[i - 1];
    const curr = solePoints[i];
    const cpx = (prev[0] + curr[0]) / 2;
    const cpy = (prev[1] + curr[1]) / 2;
    shape.quadraticCurveTo(cpx, cpy, curr[0], curr[1]);
  }

  const extrudeSettings = {
    steps: 8,
    depth: 0.95,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments: 16
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(0, 0.02, 0);

  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    
    const zAbs = Math.abs(vertex.z);
    if (vertex.y > 0.05) {
      const sideFactor = 1 - zAbs * 0.3;
      vertex.y *= sideFactor;
    }
    
    const archX = vertex.x / 2;
    const archHeight = Math.sin((archX + 0.5) * Math.PI * 0.8) * 0.12;
    if (vertex.y < 0.1 && vertex.x < 0.3 && vertex.x > -0.6) {
      vertex.y += archHeight * 0.5;
    }
    
    const heelHeight = Math.max(0, (-vertex.x - 0.5) / 0.4) * 0.08;
    vertex.y += heelHeight;
    
    const toeRise = Math.max(0, (vertex.x - 1.0) / 1.0) * 0.06;
    vertex.y += toeRise;
    
    const edgeSmoothing = Math.sin(zAbs * Math.PI / 0.95) * 0.02;
    vertex.y += edgeSmoothing;
    
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  return geometry;
};

export const createSoleTreadGeometry = (): THREE.BufferGeometry => {
  const treadPattern: THREE.BufferGeometry[] = [];
  const rows = 8;
  const cols = 6;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = -0.8 + row * (1.8 / rows);
      const z = -0.4 + col * (0.8 / cols);
      
      const patternType = Math.floor(Math.random() * 2);
      let geometry;
      
      if (patternType === 0) {
        geometry = new THREE.BoxGeometry(0.15, 0.03, 0.1);
      } else {
        geometry = new THREE.BoxGeometry(0.1, 0.03, 0.1);
      }
      
      geometry.translate(x, -0.015, z);
      treadPattern.push(geometry.toNonIndexed());
    }
  }
  
  return BufferGeometryUtils.mergeGeometries(treadPattern);
};

export const createLacesGeometry = (): THREE.Group => {
  const group = new THREE.Group();
  const laceMaterial = new THREE.MeshStandardMaterial();

  const eyeletRows = 6;
  const eyeletSpacing = 0.22;
  const startX = -0.2;
  const startY = 1.0;
  
  const leftEyelets: THREE.Vector3[] = [];
  const rightEyelets: THREE.Vector3[] = [];
  
  for (let i = 0; i < eyeletRows; i++) {
    const x = startX + i * eyeletSpacing;
    const yOffset = Math.sin(i * 0.5) * 0.02;
    const zOffset = 0.32 - Math.sin(i * 0.3) * 0.03;
    
    leftEyelets.push(new THREE.Vector3(x, startY + i * 0.05 + yOffset, zOffset));
    rightEyelets.push(new THREE.Vector3(x, startY + i * 0.05 + yOffset, -zOffset));
  }

  const lacePoints: THREE.Vector3[] = [];
  
  for (let i = 0; i < eyeletRows; i++) {
    if (i % 2 === 0) {
      lacePoints.push(leftEyelets[i].clone());
      lacePoints.push(rightEyelets[i].clone());
    } else {
      lacePoints.push(rightEyelets[i].clone());
      lacePoints.push(leftEyelets[i].clone());
    }
  }

  for (let i = 0; i < lacePoints.length - 1; i++) {
    const start = lacePoints[i];
    const end = lacePoints[i + 1];
    
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 0.06 + Math.random() * 0.02;
    mid.z += (Math.random() - 0.5) * 0.02;
    
    const curvePoints = [
      start.clone(),
      start.clone().lerp(mid, 0.3).add(new THREE.Vector3(0, 0.02, 0)),
      mid.clone(),
      end.clone().lerp(mid, 0.3).add(new THREE.Vector3(0, 0.02, 0)),
      end.clone()
    ];
    
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeometry = new THREE.TubeGeometry(curve, 16, 0.012, 8, false);
    
    const laceMesh = new THREE.Mesh(tubeGeometry, laceMaterial);
    laceMesh.userData.partName = 'laces';
    group.add(laceMesh);
  }

  for (let i = 0; i < eyeletRows - 1; i++) {
    for (const side of [1, -1]) {
      const start = new THREE.Vector3(
        startX + i * eyeletSpacing,
        startY + i * 0.05,
        side * (0.32 - Math.sin(i * 0.3) * 0.03)
      );
      const end = new THREE.Vector3(
        startX + (i + 1) * eyeletSpacing,
        startY + (i + 1) * 0.05,
        side * (0.32 - Math.sin((i + 1) * 0.3) * 0.03)
      );
      
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      mid.y += 0.03;
      mid.z += side * 0.02;
      
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const tubeGeometry = new THREE.TubeGeometry(curve, 8, 0.01, 6, false);
      
      const laceMesh = new THREE.Mesh(tubeGeometry, laceMaterial);
      laceMesh.userData.partName = 'laces';
      group.add(laceMesh);
    }
  }

  const bowCenter = new THREE.Vector3(
    startX + (eyeletRows - 1) * eyeletSpacing,
    startY + (eyeletRows - 1) * 0.05 + 0.03,
    0
  );

  for (const side of [1, -1]) {
    const bowLoop: THREE.Vector3[] = [];
    const segments = 12;
    
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const angle = t * Math.PI * 2;
      const radius = 0.08 + Math.sin(t * Math.PI * 4) * 0.02;
      
      bowLoop.push(new THREE.Vector3(
        bowCenter.x + Math.cos(angle) * radius * side,
        bowCenter.y + Math.sin(angle) * radius * 0.6 + 0.03,
        bowCenter.z + Math.sin(angle) * radius * 0.4
      ));
    }
    
    const bowCurve = new THREE.CatmullRomCurve3(bowLoop, true);
    const bowGeometry = new THREE.TubeGeometry(bowCurve, 16, 0.011, 6, false);
    const bowMesh = new THREE.Mesh(bowGeometry, laceMaterial);
    bowMesh.userData.partName = 'laces';
    group.add(bowMesh);
  }

  for (const side of [1, -1]) {
    const tipPoints: THREE.Vector3[] = [];
    const tipLength = 0.12;
    
    for (let j = 0; j < 8; j++) {
      const t = j / 7;
      tipPoints.push(new THREE.Vector3(
        bowCenter.x + side * 0.02 + t * side * tipLength,
        bowCenter.y - t * 0.1 + Math.sin(t * Math.PI * 3) * 0.02,
        bowCenter.z + (Math.random() - 0.5) * 0.01
      ));
    }
    
    const tipCurve = new THREE.CatmullRomCurve3(tipPoints);
    const tipGeometry = new THREE.TubeGeometry(tipCurve, 8, 0.008, 5, false);
    const tipMesh = new THREE.Mesh(tipGeometry, laceMaterial);
    tipMesh.userData.partName = 'laces';
    group.add(tipMesh);
  }

  const eyeletGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.01, 8);
  const eyeletMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2a2a2a, 
    metalness: 0.8, 
    roughness: 0.3 
  });
  
  for (let i = 0; i < eyeletRows; i++) {
    for (const eyelet of [leftEyelets[i], rightEyelets[i]]) {
      const eyeletMesh = new THREE.Mesh(eyeletGeometry, eyeletMaterial);
      eyeletMesh.position.copy(eyelet);
      eyeletMesh.rotateX(Math.PI / 2);
      eyeletMesh.userData.partName = 'laces';
      group.add(eyeletMesh);
    }
  }

  return group;
};

export const createLogoGeometry = (): THREE.BufferGeometry => {
  const shape = new THREE.Shape();

  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.18, 0.12, 0.35, 0.08);
  shape.quadraticCurveTo(0.5, 0.02, 0.58, -0.08);
  shape.quadraticCurveTo(0.52, -0.18, 0.35, -0.28);
  shape.quadraticCurveTo(0.18, -0.35, 0, -0.3);
  shape.quadraticCurveTo(-0.18, -0.25, -0.2, -0.12);
  shape.quadraticCurveTo(-0.22, 0, 0, 0);

  const innerHole = new THREE.Path();
  innerHole.moveTo(0.1, -0.05);
  innerHole.quadraticCurveTo(0.2, -0.02, 0.25, -0.1);
  innerHole.quadraticCurveTo(0.2, -0.18, 0.1, -0.15);
  innerHole.quadraticCurveTo(0.05, -0.12, 0.1, -0.05);
  shape.holes.push(innerHole);

  const extrudeSettings = {
    steps: 2,
    depth: 0.025,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  geometry.scale(1.4, 1.4, 1);
  geometry.rotateY(-Math.PI / 2);
  geometry.rotateZ(-0.25);
  geometry.translate(0.65, 0.78, 0.52);

  return geometry;
};

export const createHeelGeometry = (): THREE.BufferGeometry => {
  const shape = new THREE.Shape();

  const heelPoints = [
    [0, 0], [0.3, 0.06], [0.42, 0.2], [0.48, 0.42],
    [0.45, 0.65], [0.35, 0.82], [0.15, 0.9], [0, 0.92],
    [-0.15, 0.9], [-0.35, 0.82], [-0.45, 0.65], [-0.48, 0.42],
    [-0.42, 0.2], [-0.3, 0.06], [0, 0]
  ];

  shape.moveTo(heelPoints[0][0], heelPoints[0][1]);
  for (let i = 1; i < heelPoints.length; i++) {
    const x1 = heelPoints[i - 1][0];
    const y1 = heelPoints[i - 1][1];
    const x2 = heelPoints[i][0];
    const y2 = heelPoints[i][1];
    const cpx = (x1 + x2) / 2 + Math.sin(i * 0.8) * 0.015;
    const cpy = (y1 + y2) / 2 + Math.cos(i * 0.6) * 0.015;
    shape.quadraticCurveTo(cpx, cpy, x2, y2);
  }

  const extrudeSettings = {
    steps: 5,
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(-0.75, 0.35, 0);

  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    
    const curve = Math.sin(vertex.x * 2) * 0.02;
    vertex.y += curve;
    
    const edgeCurve = Math.sin(vertex.z * 4) * 0.01;
    vertex.x += edgeCurve;
    
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
};

export const createTongueGeometry = (): THREE.BufferGeometry => {
  const shape = new THREE.Shape();

  const tonguePoints = [
    [0.05, 0.85], [0.45, 0.88], [0.7, 0.95], [0.8, 1.05],
    [0.78, 1.18], [0.6, 1.25], [0.3, 1.28], [0.0, 1.28],
    [-0.3, 1.25], [-0.48, 1.18], [-0.5, 1.05], [-0.4, 0.95],
    [-0.15, 0.88], [0.05, 0.85]
  ];

  shape.moveTo(tonguePoints[0][0], tonguePoints[0][1]);
  for (let i = 1; i < tonguePoints.length; i++) {
    const prev = tonguePoints[i - 1];
    const curr = tonguePoints[i];
    const cpx = (prev[0] + curr[0]) / 2;
    const cpy = (prev[1] + curr[1]) / 2 + Math.sin(i * 0.7) * 0.01;
    shape.quadraticCurveTo(cpx, cpy, curr[0], curr[1]);
  }

  const extrudeSettings = {
    steps: 4,
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3,
    curveSegments: 8
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  geometry.rotateY(-Math.PI / 2);
  geometry.rotateX(-0.18);
  geometry.translate(0.18, 0.22, 0);

  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    
    const curve = Math.sin(vertex.z * 2.5) * 0.06;
    vertex.y += curve;
    
    const xCurve = Math.sin(vertex.x * 2) * 0.03;
    vertex.y += xCurve;
    
    const puff = Math.max(0, 1 - Math.abs(vertex.z) / 0.07) * 0.02;
    vertex.y += puff;
    
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
};

export const createLiningGeometry = (): THREE.BufferGeometry => {
  const upperGeometry = createUpperGeometry();
  const geometry = upperGeometry.clone();

  geometry.scale(0.95, 0.92, 0.95);
  geometry.translate(0, -0.015, 0);

  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    
    if (vertex.y > 0.75) {
      vertex.y *= 0.88;
      const collapse = (vertex.y - 0.75) / 0.5;
      vertex.z *= (1 - collapse * 0.2);
    }
    
    const smooth = Math.max(0, (vertex.y - 0.5) / 0.7) * 0.01;
    vertex.x += Math.sign(vertex.x) * smooth;
    
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
};

export const createStitchingLines = (): THREE.LineSegments => {
  const points: THREE.Vector3[] = [];
  
  const addStitchLine = (start: THREE.Vector3, end: THREE.Vector3, segments: number = 20) => {
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = new THREE.Vector3().lerpVectors(start, end, t);
      if (i % 2 === 0) {
        points.push(point);
      } else {
        const nextPoint = new THREE.Vector3().lerpVectors(start, end, Math.min(1, (i + 1) / segments));
        points.push(point);
        points.push(nextPoint);
      }
    }
  };

  const upperEdgePoints = [
    new THREE.Vector3(-0.6, 0.95, 0.4),
    new THREE.Vector3(-0.2, 1.05, 0.42),
    new THREE.Vector3(0.2, 1.1, 0.42),
    new THREE.Vector3(0.6, 1.08, 0.4),
    new THREE.Vector3(1.0, 0.98, 0.35)
  ];

  for (let i = 0; i < upperEdgePoints.length - 1; i++) {
    addStitchLine(upperEdgePoints[i], upperEdgePoints[i + 1]);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ 
    color: 0x333333, 
    transparent: true, 
    opacity: 0.6,
    linewidth: 1
  });

  return new THREE.LineSegments(geometry, material);
};

export const useShoeGeometries = () => {
  return useMemo(() => ({
    upper: createUpperGeometry(),
    sole: createSoleGeometry(),
    logo: createLogoGeometry(),
    heel: createHeelGeometry(),
    tongue: createTongueGeometry(),
    lining: createLiningGeometry()
  }), []);
};
