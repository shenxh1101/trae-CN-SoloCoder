import * as THREE from 'three';
import { ColorMode } from '../types';

export function generateColor(mode: ColorMode): THREE.Color {
  const color = new THREE.Color();
  
  switch (mode) {
    case 'rainbow':
      color.setHSL(Math.random(), 0.85, 0.6);
      break;
    case 'warm':
      color.setHSL(0.05 + Math.random() * 0.15, 0.9, 0.55);
      break;
    case 'cool':
      color.setHSL(0.5 + Math.random() * 0.25, 0.85, 0.55);
      break;
  }
  
  return color;
}

export function getTopColor(bottomColor: THREE.Color): THREE.Color {
  const topColor = bottomColor.clone();
  topColor.multiplyScalar(0.3);
  topColor.offsetHSL(0, 0, 0.2);
  return topColor;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

export function generateParticleColor(mode: ColorMode): THREE.Color {
  const color = generateColor(mode);
  color.multiplyScalar(1.2);
  return color;
}
