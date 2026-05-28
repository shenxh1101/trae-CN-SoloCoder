import * as THREE from 'three';

export type ColorMode = 'random' | 'redOrange' | 'blueWhite';

export interface ParticleSystemOptions {
  count?: number;
  force?: number;
  size?: number;
  colorMode?: ColorMode;
  gravity?: boolean;
  slowMotion?: boolean;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private mainParticles: THREE.Points;
  private mainGeometry: THREE.BufferGeometry;
  private mainMaterial: THREE.PointsMaterial;
  private velocities: Float32Array;
  private positions: Float32Array;
  private colors: Float32Array;
  private alphas: Float32Array;
  private particleCount: number;
  private explosionForce: number;
  private particleSize: number;
  private colorMode: ColorMode;
  private gravityEnabled: boolean;
  private slowMotionEnabled: boolean;
  private explosionTime: number;
  private isExploding: boolean;
  private gravity: number = -9.8;

  private trailLength: number = 8;
  private trailParticles: THREE.Points[] = [];
  private trailGeometries: THREE.BufferGeometry[] = [];
  private trailMaterials: THREE.PointsMaterial[] = [];
  private positionHistory: Float32Array[] = [];

  constructor(scene: THREE.Scene, options: ParticleSystemOptions = {}) {
    this.scene = scene;
    this.particleCount = options.count ?? 5000;
    this.explosionForce = options.force ?? 50;
    this.particleSize = options.size ?? 2;
    this.colorMode = options.colorMode ?? 'random';
    this.gravityEnabled = options.gravity ?? false;
    this.slowMotionEnabled = options.slowMotion ?? false;
    this.explosionTime = 0;
    this.isExploding = false;

    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.alphas = new Float32Array(this.particleCount);

    for (let i = 0; i < this.trailLength; i++) {
      this.positionHistory.push(new Float32Array(this.particleCount * 3));
    }

    const texture = this.createParticleTexture();

    this.mainGeometry = new THREE.BufferGeometry();
    this.mainGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.mainGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.mainMaterial = new THREE.PointsMaterial({
      size: this.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: texture,
      sizeAttenuation: true,
    });

    this.mainParticles = new THREE.Points(this.mainGeometry, this.mainMaterial);
    this.scene.add(this.mainParticles);

    this.createTrailParticles(texture);
    this.initParticles();
  }

  private createParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createTrailParticles(texture: THREE.Texture): void {
    for (let i = 0; i < this.trailLength; i++) {
      const trailGeometry = new THREE.BufferGeometry();
      const trailPositions = new Float32Array(this.particleCount * 3);
      const trailColors = new Float32Array(this.particleCount * 3);
      
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

      const opacity = 1 - (i + 1) / (this.trailLength + 1);
      const size = this.particleSize * (1 - (i + 1) / (this.trailLength + 1) * 0.7);

      const trailMaterial = new THREE.PointsMaterial({
        size: size,
        vertexColors: true,
        transparent: true,
        opacity: opacity * 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: texture,
        sizeAttenuation: true,
      });

      const trailParticle = new THREE.Points(trailGeometry, trailMaterial);
      this.scene.add(trailParticle);

      this.trailGeometries.push(trailGeometry);
      this.trailMaterials.push(trailMaterial);
      this.trailParticles.push(trailParticle);
    }
  }

  private getColorByMode(index: number): THREE.Color {
    const color = new THREE.Color();
    
    switch (this.colorMode) {
      case 'redOrange':
        color.setHSL(0.05 + Math.random() * 0.1, 1, 0.5 + Math.random() * 0.3);
        break;
      case 'blueWhite':
        const t = Math.random();
        if (t < 0.5) {
          color.setHSL(0.55 + Math.random() * 0.1, 0.8, 0.6 + Math.random() * 0.2);
        } else {
          color.setHSL(0, 0, 0.8 + Math.random() * 0.2);
        }
        break;
      case 'random':
      default:
        color.setHSL(Math.random(), 0.8 + Math.random() * 0.2, 0.5 + Math.random() * 0.3);
        break;
    }
    
    return color;
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      this.positions[i3] = 0;
      this.positions[i3 + 1] = 0;
      this.positions[i3 + 2] = 0;

      for (let h = 0; h < this.trailLength; h++) {
        this.positionHistory[h][i3] = 0;
        this.positionHistory[h][i3 + 1] = 0;
        this.positionHistory[h][i3 + 2] = 0;
      }

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = this.explosionForce * (0.5 + Math.random() * 0.5);

      this.velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
      this.velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      this.velocities[i3 + 2] = Math.cos(phi) * speed;

      const color = this.getColorByMode(i);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      this.alphas[i] = 1;
    }

    this.mainGeometry.attributes.position.needsUpdate = true;
    this.mainGeometry.attributes.color.needsUpdate = true;

    for (let h = 0; h < this.trailLength; h++) {
      const trailPosAttr = this.trailGeometries[h].attributes.position as THREE.BufferAttribute;
      const trailColorAttr = this.trailGeometries[h].attributes.color as THREE.BufferAttribute;
      
      trailPosAttr.array.set(this.positionHistory[h]);
      trailColorAttr.array.set(this.colors);
      trailPosAttr.needsUpdate = true;
      trailColorAttr.needsUpdate = true;
    }
  }

  explode(): void {
    this.explosionTime = 0;
    this.isExploding = true;
    this.initParticles();
    this.mainMaterial.opacity = 1;
  }

  reset(): void {
    this.explode();
  }

  update(deltaTime: number): void {
    if (!this.isExploding) return;

    const timeScale = this.slowMotionEnabled ? 0.5 : 1;
    const dt = deltaTime * timeScale;
    this.explosionTime += dt;

    const explosionDuration = 3;
    const fadeOutStart = 2;

    for (let h = this.trailLength - 1; h > 0; h--) {
      this.positionHistory[h].set(this.positionHistory[h - 1]);
    }
    this.positionHistory[0].set(this.positions);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      if (this.gravityEnabled) {
        this.velocities[i3 + 1] += this.gravity * dt;
      }

      const drag = 1 - 0.5 * dt;
      this.velocities[i3] *= drag;
      this.velocities[i3 + 1] *= drag;
      this.velocities[i3 + 2] *= drag;

      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      if (this.explosionTime > fadeOutStart) {
        this.alphas[i] = Math.max(0, 1 - (this.explosionTime - fadeOutStart) / (explosionDuration - fadeOutStart));
      }
    }

    this.mainGeometry.attributes.position.needsUpdate = true;
    this.mainMaterial.opacity = this.alphas[0];

    for (let h = 0; h < this.trailLength; h++) {
      const trailPosAttr = this.trailGeometries[h].attributes.position as THREE.BufferAttribute;
      trailPosAttr.array.set(this.positionHistory[h]);
      trailPosAttr.needsUpdate = true;
      this.trailMaterials[h].opacity = (1 - (h + 1) / (this.trailLength + 1)) * 0.6 * this.alphas[0];
    }

    if (this.explosionTime > explosionDuration) {
      this.explode();
    }
  }

  setCount(count: number): void {
    this.scene.remove(this.mainParticles);
    for (let h = 0; h < this.trailLength; h++) {
      this.scene.remove(this.trailParticles[h]);
      this.trailGeometries[h].dispose();
      this.trailMaterials[h].dispose();
    }
    this.trailParticles = [];
    this.trailGeometries = [];
    this.trailMaterials = [];
    this.positionHistory = [];

    this.mainGeometry.dispose();
    this.mainMaterial.dispose();

    this.particleCount = count;
    
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.alphas = new Float32Array(count);

    for (let i = 0; i < this.trailLength; i++) {
      this.positionHistory.push(new Float32Array(count * 3));
    }

    const texture = this.createParticleTexture();

    this.mainGeometry = new THREE.BufferGeometry();
    this.mainGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.mainGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.mainMaterial = new THREE.PointsMaterial({
      size: this.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: texture,
      sizeAttenuation: true,
    });

    this.mainParticles = new THREE.Points(this.mainGeometry, this.mainMaterial);
    this.scene.add(this.mainParticles);

    this.createTrailParticles(texture);
    
    this.explode();
  }

  setForce(force: number): void {
    this.explosionForce = force;
  }

  setSize(size: number): void {
    this.particleSize = size;
    this.mainMaterial.size = size;

    for (let h = 0; h < this.trailLength; h++) {
      const trailSize = size * (1 - (h + 1) / (this.trailLength + 1) * 0.7);
      this.trailMaterials[h].size = trailSize;
    }
  }

  setColorMode(mode: ColorMode): void {
    this.colorMode = mode;
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const color = this.getColorByMode(i);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
    }
    this.mainGeometry.attributes.color.needsUpdate = true;

    for (let h = 0; h < this.trailLength; h++) {
      const trailColorAttr = this.trailGeometries[h].attributes.color as THREE.BufferAttribute;
      trailColorAttr.array.set(this.colors);
      trailColorAttr.needsUpdate = true;
    }
  }

  setGravity(enabled: boolean): void {
    this.gravityEnabled = enabled;
  }

  setSlowMotion(enabled: boolean): void {
    this.slowMotionEnabled = enabled;
  }

  getCount(): number {
    return this.particleCount;
  }

  dispose(): void {
    this.mainGeometry.dispose();
    this.mainMaterial.dispose();
    this.scene.remove(this.mainParticles);

    for (let h = 0; h < this.trailLength; h++) {
      this.trailGeometries[h].dispose();
      this.trailMaterials[h].dispose();
      this.scene.remove(this.trailParticles[h]);
    }
  }
}
