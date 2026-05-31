import * as THREE from 'three';
import { StairConfig } from '../types';
import { SeedRandom } from './SeedRandom';
import { StyleSystem } from './StyleSystem';

export class ParticleSystem {
  private config: StairConfig;
  private random: SeedRandom;
  private styleSystem: StyleSystem;
  private particles: THREE.InstancedMesh | null = null;
  private particleGeometry: THREE.SphereGeometry;
  private particleCount: number = 50;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private basePositions: Array<{ x: number; y: number; z: number; phase: number; side: 'left' | 'right' }> = [];

  constructor(config: StairConfig) {
    this.config = config;
    this.random = new SeedRandom(config.seed + '-particles');
    this.styleSystem = new StyleSystem(config.seed, config.stairColor, config.accentColor);
    this.particleGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    this.particleCount = config.particleCount;
    this.generateBasePositions();
  }

  private generateBasePositions(): void {
    this.basePositions = [];
    const { stepWidth, stepHeight, stepDepth, spiral, spiralAngle } = this.config;
    
    for (let i = 0; i < this.particleCount; i++) {
      const stairIndex = i * 3;
      const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
      
      let x = 0;
      let y = stairIndex * stepHeight;
      let z = -stairIndex * stepDepth;
      let rotationY = 0;

      if (spiral) {
        const angle = (stairIndex * spiralAngle * Math.PI) / 180;
        const radius = 2 + stairIndex * 0.02;
        x = Math.sin(angle) * radius;
        z = -Math.cos(angle) * radius - stairIndex * stepDepth * 0.3;
        rotationY = angle;
      }

      const offsetX = side === 'left' 
        ? -stepWidth / 2 - this.random.nextRange(0.5, 2)
        : stepWidth / 2 + this.random.nextRange(0.5, 2);
      
      const offsetY = this.random.nextRange(-1, 3);
      const offsetZ = this.random.nextRange(-stepDepth / 2, stepDepth / 2);

      const rotatedOffsetX = offsetX * Math.cos(rotationY) - offsetZ * Math.sin(rotationY);
      const rotatedOffsetZ = offsetX * Math.sin(rotationY) + offsetZ * Math.cos(rotationY);

      this.basePositions.push({
        x: x + rotatedOffsetX,
        y: y + offsetY,
        z: z + rotatedOffsetZ,
        phase: this.random.nextRange(0, Math.PI * 2),
        side,
      });
    }
  }

  updateConfig(config: Partial<StairConfig>): void {
    const needsRebuild = 
      config.seed !== undefined ||
      config.stepWidth !== undefined ||
      config.stepHeight !== undefined ||
      config.stepDepth !== undefined ||
      config.spiral !== undefined ||
      config.spiralAngle !== undefined ||
      config.particleCount !== undefined;

    this.config = { ...this.config, ...config };

    if (config.seed) {
      this.random = new SeedRandom(config.seed + '-particles');
      this.styleSystem.updateSeed(config.seed);
    }

    if (config.stairColor || config.accentColor) {
      this.styleSystem.updateColors(
        config.stairColor || this.config.stairColor,
        config.accentColor || this.config.accentColor
      );
    }

    if (config.particleCount !== undefined) {
      this.particleCount = config.particleCount;
    }

    if (needsRebuild) {
      this.generateBasePositions();
      this.rebuildParticles();
    } else {
      this.updateMaterial();
    }
  }

  private rebuildParticles(): void {
    if (this.particles) {
      this.particles.geometry.dispose();
      if (Array.isArray(this.particles.material)) {
        this.particles.material.forEach(m => m.dispose());
      } else {
        this.particles.material.dispose();
      }
      this.particles = null;
    }

    if (this.config.particleEnabled && this.particleCount > 0) {
      const material = this.createParticleMaterial();
      this.particles = new THREE.InstancedMesh(
        this.particleGeometry,
        material,
        this.particleCount
      );
      this.particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }

  private updateMaterial(): void {
    if (this.particles) {
      if (Array.isArray(this.particles.material)) {
        this.particles.material.forEach(m => m.dispose());
      } else {
        this.particles.material.dispose();
      }
      this.particles.material = this.createParticleMaterial();
    }
  }

  private createParticleMaterial(): THREE.Material {
    if (this.config.style === 'neon') {
      const color = this.styleSystem.getParticleColor(0);
      return new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
      });
    }
    
    return new THREE.MeshStandardMaterial({
      color: this.styleSystem.getParticleColor(0),
      emissive: this.styleSystem.getParticleColor(0),
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.7,
      roughness: 0.2,
      metalness: 0.8,
    });
  }

  addToScene(scene: THREE.Group): void {
    if (!this.particles && this.config.particleEnabled) {
      this.rebuildParticles();
    }
    if (this.particles) {
      scene.add(this.particles);
    }
  }

  removeFromScene(scene: THREE.Group): void {
    if (this.particles) {
      scene.remove(this.particles);
    }
  }

  update(time: number, centerIndex: number): void {
    if (!this.particles || !this.config.particleEnabled) return;

    const startIndex = Math.max(0, centerIndex - 5);
    const endIndex = Math.min(this.particleCount, centerIndex / 3 + 40);

    for (let i = 0; i < this.particleCount; i++) {
      const pos = this.basePositions[i];
      
      const isVisible = i >= startIndex && i < endIndex;
      
      if (!isVisible) {
        this.dummy.position.set(0, -1000, 0);
        this.dummy.updateMatrix();
        this.particles.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      const breathOffset = Math.sin(time * 2 + pos.phase) * 0.3;
      const floatOffset = Math.sin(time * 1.5 + pos.phase * 2) * 0.2;
      
      const scale = 0.8 + Math.sin(time * 3 + pos.phase) * 0.2;
      
      this.dummy.position.set(
        pos.x + floatOffset * 0.5,
        pos.y + breathOffset,
        pos.z
      );
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.particles.setMatrixAt(i, this.dummy.matrix);

      if (this.config.style === 'neon') {
        const color = new THREE.Color(this.styleSystem.getParticleColor(i));
        this.particles.setColorAt(i, color);
      }
    }

    this.particles.instanceMatrix.needsUpdate = true;
    if (this.particles.instanceColor) {
      this.particles.instanceColor.needsUpdate = true;
    }
  }

  setEnabled(enabled: boolean): void {
    if (enabled !== this.config.particleEnabled) {
      this.config.particleEnabled = enabled;
      if (enabled && !this.particles) {
        this.rebuildParticles();
      } else if (!enabled && this.particles) {
        this.particles.visible = false;
      } else if (enabled && this.particles) {
        this.particles.visible = true;
      }
    }
  }

  dispose(): void {
    this.particleGeometry.dispose();
    if (this.particles) {
      this.particles.geometry.dispose();
      if (Array.isArray(this.particles.material)) {
        this.particles.material.forEach(m => m.dispose());
      } else {
        this.particles.material.dispose();
      }
    }
  }
}
