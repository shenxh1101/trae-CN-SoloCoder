import * as THREE from 'three';

export function exportToOBJ(group: THREE.Group, filename: string = 'creature.obj'): void {
  let output = '';
  let vertexIndex = 1;

  output += '# 3D Creature OBJ Export\n';
  output += `# Generated: ${new Date().toISOString()}\n`;
  output += `# Vertices: ${countVertices(group)}\n`;
  output += `# Faces: ${countFaces(group)}\n\n`;

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mesh = child;
      const geometry = mesh.geometry;
      const matrix = mesh.matrixWorld;

      const positionAttribute = geometry.getAttribute('position');
      if (!positionAttribute) return;

      const vertices: number[] = [];
      for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3(
          positionAttribute.getX(i),
          positionAttribute.getY(i),
          positionAttribute.getZ(i),
        );
        vertex.applyMatrix4(matrix);
        vertices.push(vertex.x, vertex.y, vertex.z);
      }

      for (let i = 0; i < vertices.length; i += 3) {
        output += `v ${vertices[i].toFixed(6)} ${vertices[i + 1].toFixed(6)} ${vertices[i + 2].toFixed(6)}\n`;
      }

      const normalAttribute = geometry.getAttribute('normal');
      if (normalAttribute) {
        for (let i = 0; i < normalAttribute.count; i++) {
          const normal = new THREE.Vector3(
            normalAttribute.getX(i),
            normalAttribute.getY(i),
            normalAttribute.getZ(i),
          );
          normal.transformDirection(matrix);
          output += `vn ${normal.x.toFixed(6)} ${normal.y.toFixed(6)} ${normal.z.toFixed(6)}\n`;
        }
      }

      const uvAttribute = geometry.getAttribute('uv');
      if (uvAttribute) {
        for (let i = 0; i < uvAttribute.count; i++) {
          output += `vt ${uvAttribute.getX(i).toFixed(6)} ${uvAttribute.getY(i).toFixed(6)}\n`;
        }
      }

      const index = geometry.getIndex();
      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          const a = index.getX(i) + vertexIndex;
          const b = index.getX(i + 1) + vertexIndex;
          const c = index.getX(i + 2) + vertexIndex;
          output += `f ${a} ${b} ${c}\n`;
        }
      } else {
        for (let i = 0; i < positionAttribute.count; i += 3) {
          const a = i + vertexIndex;
          const b = i + 1 + vertexIndex;
          const c = i + 2 + vertexIndex;
          output += `f ${a} ${b} ${c}\n`;
        }
      }

      vertexIndex += positionAttribute.count;
    }
  });

  downloadFile(output, filename, 'text/plain');
}

function countVertices(group: THREE.Group): number {
  let count = 0;
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const positionAttribute = child.geometry.getAttribute('position');
      if (positionAttribute) count += positionAttribute.count;
    }
  });
  return count;
}

function countFaces(group: THREE.Group): number {
  let count = 0;
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const index = child.geometry.getIndex();
      const positionAttribute = child.geometry.getAttribute('position');
      if (index) {
        count += index.count / 3;
      } else if (positionAttribute) {
        count += positionAttribute.count / 3;
      }
    }
  });
  return Math.floor(count);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
