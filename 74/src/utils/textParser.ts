import * as THREE from 'three';
import { FontWeight } from '@/types';

export async function loadFonts(): Promise<void> {
  return Promise.resolve();
}

export function generateParticlePositions(
  text: string,
  fontWeight: FontWeight,
  thickness: number,
  particleDensity: number = 1
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  
  if (!text) return positions;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return positions;

  const fontSize = 100;
  const font = fontWeight === 'bold' 
    ? `bold ${fontSize}px Arial, sans-serif` 
    : `${fontSize}px Arial, sans-serif`;
  
  ctx.font = font;
  const textWidth = ctx.measureText(text).width;
  
  canvas.width = textWidth + 40;
  canvas.height = fontSize + 40;
  
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.font = font;
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 20, canvas.height / 2);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const step = Math.max(2, Math.floor(8 / particleDensity));
  const scale = 0.15;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const index = (y * canvas.width + x) * 4;
      const brightness = data[index];
      
      if (brightness > 128) {
        for (let layer = 0; layer < thickness; layer++) {
          const z = (layer - thickness / 2) * 0.8;
          const jitterX = (Math.random() - 0.5) * 0.2;
          const jitterY = (Math.random() - 0.5) * 0.2;
          const jitterZ = (Math.random() - 0.5) * 0.2;
          
          positions.push(new THREE.Vector3(
            (x - centerX) * scale + jitterX,
            -(y - centerY) * scale + jitterY,
            z + jitterZ
          ));
        }
      }
    }
  }

  return positions;
}

export function interpolateColor(
  colorTop: string,
  colorBottom: string,
  t: number
): THREE.Color {
  const top = new THREE.Color(colorTop);
  const bottom = new THREE.Color(colorBottom);
  
  return new THREE.Color().lerpColors(bottom, top, t);
}
