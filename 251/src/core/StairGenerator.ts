import * as THREE from 'three';
import { StairConfig, StepData, VisualStyle } from '../types';
import { SeedRandom } from './SeedRandom';
import { StyleSystem } from './StyleSystem';

export class StairGenerator {
  private config: StairConfig;
  private random: SeedRandom;
  private styleSystem: StyleSystem;
  private steps: Map<number, THREE.Mesh> = new Map();
  private stepGeometry: THREE.BoxGeometry;
  private maxVisibleSteps: number = 100;
  private currentCenterIndex: number = 0;

  constructor(config: StairConfig) {
    this.config = config;
    this.random = new SeedRandom(config.seed);
    this.styleSystem = new StyleSystem(config.seed, config.stairColor, config.accentColor);
    this.stepGeometry = new THREE.BoxGeometry(
      config.stepWidth,
      config.stepHeight,
      config.stepDepth
    );
  }

  updateConfig(config: Partial<StairConfig>): void {
    const needsRebuild = 
      config.seed !== undefined && config.seed !== this.config.seed ||
      config.stepWidth !== undefined ||
      config.stepHeight !== undefined ||
      config.stepDepth !== undefined ||
      config.spiral !== undefined ||
      config.spiralAngle !== undefined ||
      config.style !== undefined ||
      config.stairColor !== undefined ||
      config.accentColor !== undefined;

    this.config = { ...this.config, ...config };

    if (config.seed) {
      this.random = new SeedRandom(config.seed);
      this.styleSystem.updateSeed(config.seed);
    }

    if (config.stairColor || config.accentColor) {
      this.styleSystem.updateColors(
        config.stairColor || this.config.stairColor,
        config.accentColor || this.config.accentColor
      );
    }

    if (needsRebuild) {
      if (config.stepWidth || config.stepHeight || config.stepDepth) {
        this.stepGeometry.dispose();
        this.stepGeometry = new THREE.BoxGeometry(
          this.config.stepWidth,
          this.config.stepHeight,
          this.config.stepDepth
        );
      }
      this.rebuildAllSteps();
    } else {
      this.updateMaterials();
    }
  }

  getStepData(index: number): StepData {
    const { stepHeight, stepDepth, spiral, spiralAngle } = this.config;
    
    let x = 0;
    let y = index * stepHeight;
    let z = -index * stepDepth;
    let rotationY = 0;

    if (spiral) {
      const angle = (index * spiralAngle * Math.PI) / 180;
      const radius = 2 + index * 0.02;
      x = Math.sin(angle) * radius;
      z = -Math.cos(angle) * radius - index * stepDepth * 0.3;
      rotationY = angle;
    }

    return {
      index,
      position: { x, y, z },
      rotation: { x: 0, y: rotationY, z: 0 },
    };
  }

  createStep(index: number): THREE.Mesh {
    const stepData = this.getStepData(index);
    const material = this.styleSystem.createMaterial(this.config.style, index);
    
    const step = new THREE.Mesh(this.stepGeometry, material);
    step.position.set(stepData.position.x, stepData.position.y, stepData.position.z);
    step.rotation.set(stepData.rotation.x, stepData.rotation.y, stepData.rotation.z);
    step.castShadow = true;
    step.receiveShadow = true;
    step.userData.stepIndex = index;

    return step;
  }

  getSteps(centerIndex: number, group: THREE.Group): void {
    this.currentCenterIndex = centerIndex;
    const startIndex = Math.max(0, centerIndex - 10);
    const endIndex = centerIndex + this.maxVisibleSteps;

    const indicesToKeep = new Set<number>();
    
    for (let i = startIndex; i < endIndex; i++) {
      indicesToKeep.add(i);
      if (!this.steps.has(i)) {
        const step = this.createStep(i);
        this.steps.set(i, step);
        group.add(step);
      }
    }

    for (const [index, step] of this.steps) {
      if (!indicesToKeep.has(index)) {
        group.remove(step);
        if (Array.isArray(step.material)) {
          step.material.forEach(m => m.dispose());
        } else {
          step.material.dispose();
        }
        this.steps.delete(index);
      }
    }
  }

  private rebuildAllSteps(): void {
    for (const [, step] of this.steps) {
      if (Array.isArray(step.material)) {
        step.material.forEach(m => m.dispose());
      } else {
        step.material.dispose();
      }
    }
    this.steps.clear();
  }

  private updateMaterials(): void {
    for (const [index, step] of this.steps) {
      if (Array.isArray(step.material)) {
        step.material.forEach(m => m.dispose());
      } else {
        step.material.dispose();
      }
      step.material = this.styleSystem.createMaterial(this.config.style, index);
    }
  }

  getStepAtPosition(x: number, z: number, tolerance: number = 0.5): number | null {
    for (const [index, step] of this.steps) {
      const stepData = this.getStepData(index);
      const halfWidth = this.config.stepWidth / 2;
      const halfDepth = this.config.stepDepth / 2;
      
      const dx = Math.abs(x - stepData.position.x);
      const dz = Math.abs(z - stepData.position.z);
      
      if (dx < halfWidth + tolerance && dz < halfDepth + tolerance) {
        return index;
      }
    }
    return null;
  }

  getStepPosition(index: number): THREE.Vector3 {
    const stepData = this.getStepData(index);
    return new THREE.Vector3(
      stepData.position.x,
      stepData.position.y + this.config.stepHeight,
      stepData.position.z
    );
  }

  getForwardDirection(index: number): THREE.Vector3 {
    const stepData = this.getStepData(index);
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), stepData.rotation.y);
    return direction;
  }

  getStyleSystem(): StyleSystem {
    return this.styleSystem;
  }

  getCurrentStyle(): VisualStyle {
    return this.config.style;
  }

  getConfig(): StairConfig {
    return { ...this.config };
  }

  dispose(): void {
    this.stepGeometry.dispose();
    for (const [, step] of this.steps) {
      if (Array.isArray(step.material)) {
        step.material.forEach(m => m.dispose());
      } else {
        step.material.dispose();
      }
    }
    this.steps.clear();
  }
}
