import * as THREE from 'three';
import { VisualStyle, StyleMaterialConfig } from '../types';
import { SeedRandom } from './SeedRandom';

export class StyleSystem {
  private random: SeedRandom;
  private baseColor: string;
  private accentColor: string;

  constructor(seed: string, baseColor: string, accentColor: string) {
    this.random = new SeedRandom(seed);
    this.baseColor = baseColor;
    this.accentColor = accentColor;
  }

  updateSeed(seed: string): void {
    this.random = new SeedRandom(seed);
  }

  updateColors(baseColor: string, accentColor: string): void {
    this.baseColor = baseColor;
    this.accentColor = accentColor;
  }

  getMaterialConfig(style: VisualStyle, index: number = 0): StyleMaterialConfig {
    const colorVariance = this.random.nextRange(0, 20);
    const variedColor = this.varyColor(this.baseColor, colorVariance);
    
    switch (style) {
      case 'neon':
        return this.getNeonConfig(variedColor, index);
      case 'stone':
        return this.getStoneConfig(variedColor, index);
      case 'glass':
        return this.getGlassConfig(variedColor, index);
      default:
        return this.getNeonConfig(variedColor, index);
    }
  }

  private getNeonConfig(color: string, index: number): StyleMaterialConfig {
    const pulse = Math.sin(index * 0.5) * 0.2 + 0.8;
    return {
      color,
      emissive: color,
      emissiveIntensity: 0.8 * pulse,
      roughness: 0.2,
      metalness: 0.8,
    };
  }

  private getStoneConfig(color: string, index: number): StyleMaterialConfig {
    const darkened = this.darkenColor(color, 30 + index * 2);
    return {
      color: darkened,
      roughness: 0.9,
      metalness: 0.1,
    };
  }

  private getGlassConfig(color: string, index: number): StyleMaterialConfig {
    const opacity = 0.6 + Math.sin(index * 0.3) * 0.2;
    return {
      color,
      transparent: true,
      opacity,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
    };
  }

  createMaterial(style: VisualStyle, index: number = 0): THREE.Material {
    const config = this.getMaterialConfig(style, index);
    
    if (style === 'glass') {
      return new THREE.MeshPhysicalMaterial({
        color: config.color,
        transparent: config.transparent,
        opacity: config.opacity,
        roughness: config.roughness,
        metalness: config.metalness,
        transmission: config.transmission,
        thickness: config.thickness,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        ior: 1.5,
      });
    }
    
    if (style === 'neon') {
      return new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.emissive || config.color,
        emissiveIntensity: config.emissiveIntensity || 0,
        roughness: config.roughness || 0.5,
        metalness: config.metalness || 0.5,
      });
    }
    
    return new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: config.roughness || 0.5,
      metalness: config.metalness || 0.5,
    });
  }

  getParticleColor(index: number = 0): string {
    const colors = [this.baseColor, this.accentColor];
    const base = colors[index % 2];
    return this.varyColor(base, 40);
  }

  getBackgroundColor(style: VisualStyle): THREE.Color {
    switch (style) {
      case 'neon':
        return new THREE.Color(0x050510);
      case 'stone':
        return new THREE.Color(0x1a1a1a);
      case 'glass':
        return new THREE.Color(0x0a0a1a);
      default:
        return new THREE.Color(0x050510);
    }
  }

  getFogConfig(style: VisualStyle): { color: number; near: number; far: number } {
    switch (style) {
      case 'neon':
        return { color: 0x050510, near: 5, far: 50 };
      case 'stone':
        return { color: 0x1a1a1a, near: 3, far: 40 };
      case 'glass':
        return { color: 0x0a0a1a, near: 10, far: 80 };
      default:
        return { color: 0x050510, near: 5, far: 50 };
    }
  }

  getLightConfig(style: VisualStyle): { ambient: number; directional: number; position: [number, number, number] } {
    switch (style) {
      case 'neon':
        return { ambient: 0.2, directional: 0.5, position: [10, 20, 10] };
      case 'stone':
        return { ambient: 0.4, directional: 0.8, position: [15, 25, 15] };
      case 'glass':
        return { ambient: 0.3, directional: 0.6, position: [10, 15, 10] };
      default:
        return { ambient: 0.2, directional: 0.5, position: [10, 20, 10] };
    }
  }

  getBloomConfig(style: VisualStyle): { enabled: boolean; intensity: number; luminanceThreshold: number; luminanceSmoothing: number } {
    switch (style) {
      case 'neon':
        return { enabled: true, intensity: 1.5, luminanceThreshold: 0.1, luminanceSmoothing: 0.9 };
      case 'stone':
        return { enabled: false, intensity: 0, luminanceThreshold: 1, luminanceSmoothing: 0.9 };
      case 'glass':
        return { enabled: true, intensity: 0.5, luminanceThreshold: 0.5, luminanceSmoothing: 0.9 };
      default:
        return { enabled: false, intensity: 0, luminanceThreshold: 1, luminanceSmoothing: 0.9 };
    }
  }

  private varyColor(hexColor: string, variance: number): string {
    return this.random.nextColorInRange(hexColor, variance);
  }

  private darkenColor(hexColor: string, amount: number): string {
    const hex = hexColor.replace('#', '');
    const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - amount);
    const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  static getStyleDisplayName(style: VisualStyle): string {
    const names: Record<VisualStyle, string> = {
      neon: '霓虹',
      stone: '石质',
      glass: '琉璃',
    };
    return names[style];
  }

  static getBackgroundDisplayName(background: 'starfield' | 'abyss'): string {
    return background === 'starfield' ? '星空' : '深渊';
  }
}
