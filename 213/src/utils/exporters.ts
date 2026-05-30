import * as THREE from 'three';

function download(data: string | Blob, filename: string): void {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportScreenshot(canvas: HTMLCanvasElement): void {
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'terrain-screenshot.png';
  a.click();
}

export function exportOBJ(geometry: THREE.BufferGeometry): void {
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normAttr = geometry.getAttribute('normal') as THREE.BufferAttribute | null;
  const indexAttr = geometry.getIndex();

  let obj = '';

  for (let i = 0; i < posAttr.count; i++) {
    obj += `v ${posAttr.getX(i)} ${posAttr.getY(i)} ${posAttr.getZ(i)}\n`;
  }

  if (normAttr) {
    for (let i = 0; i < normAttr.count; i++) {
      obj += `vn ${normAttr.getX(i)} ${normAttr.getY(i)} ${normAttr.getZ(i)}\n`;
    }
  }

  if (indexAttr) {
    for (let i = 0; i < indexAttr.count; i += 3) {
      const a = indexAttr.getX(i) + 1;
      const b = indexAttr.getX(i + 1) + 1;
      const c = indexAttr.getX(i + 2) + 1;
      if (normAttr) {
        obj += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      } else {
        obj += `f ${a} ${b} ${c}\n`;
      }
    }
  } else {
    for (let i = 0; i < posAttr.count; i += 3) {
      const a = i + 1;
      const b = i + 2;
      const c = i + 3;
      if (normAttr) {
        obj += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      } else {
        obj += `f ${a} ${b} ${c}\n`;
      }
    }
  }

  download(obj, 'terrain.obj');
}

export function exportHeightMap(heightData: Float32Array, segments: number): void {
  const resolution = segments + 1;
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(resolution, resolution);

  for (let i = 0; i < heightData.length; i++) {
    const v = Math.round(Math.max(0, Math.min(1, heightData[i])) * 255);
    imageData.data[i * 4] = v;
    imageData.data[i * 4 + 1] = v;
    imageData.data[i * 4 + 2] = v;
    imageData.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'terrain-heightmap.png';
  a.click();
}
