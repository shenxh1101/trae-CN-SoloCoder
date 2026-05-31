import * as THREE from 'three';
import { CameraMode, StairConfig } from '../types';
import { StairGenerator } from './StairGenerator';
import { AudioManager } from './AudioManager';

export interface MovementState {
  position: THREE.Vector3;
  rotation: { yaw: number; pitch: number };
  velocity: THREE.Vector3;
  currentStairIndex: number;
  isMoving: boolean;
  isGrounded: boolean;
}

export class MovementController {
  private config: StairConfig;
  private stairGenerator: StairGenerator;
  private audioManager: AudioManager;
  
  private state: MovementState;
  private cameraMode: CameraMode = 'firstPerson';
  
  private keys: Set<string> = new Set();
  private mouseSensitivity: number = 0.002;
  private movementSpeed: number = 5;
  private autoWalkSpeed: number = 3;
  
  private headBobPhase: number = 0;
  private lastStepStairIndex: number = -1;
  
  private minPitch: number = -Math.PI / 2 + 0.1;
  private maxPitch: number = Math.PI / 2 - 0.1;
  
  private pointerLocked: boolean = false;

  constructor(
    config: StairConfig,
    stairGenerator: StairGenerator,
    audioManager: AudioManager
  ) {
    this.config = config;
    this.stairGenerator = stairGenerator;
    this.audioManager = audioManager;
    
    const initialPos = stairGenerator.getStepPosition(0);
    this.state = {
      position: initialPos,
      rotation: { yaw: 0, pitch: 0 },
      velocity: new THREE.Vector3(),
      currentStairIndex: 0,
      isMoving: false,
      isGrounded: true,
    };
  }

  updateConfig(config: Partial<StairConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.soundEnabled !== undefined) {
      this.audioManager.setEnabled(config.soundEnabled);
    }
    if (config.soundVolume !== undefined) {
      this.audioManager.setVolume(config.soundVolume);
    }
  }

  setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
  }

  handleKeyDown(code: string): void {
    this.keys.add(code);
  }

  handleKeyUp(code: string): void {
    this.keys.delete(code);
  }

  handleMouseMove(deltaX: number, deltaY: number): void {
    if (!this.pointerLocked) return;
    
    if (!this.config.autoWalk) {
      this.state.rotation.yaw -= deltaX * this.mouseSensitivity;
    }
    this.state.rotation.pitch -= deltaY * this.mouseSensitivity;
    this.state.rotation.pitch = Math.max(
      this.minPitch,
      Math.min(this.maxPitch, this.state.rotation.pitch)
    );
  }

  setPointerLocked(locked: boolean): void {
    this.pointerLocked = locked;
  }

  update(deltaTime: number): MovementState {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.state.rotation.yaw);
    
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let moveX = 0;
    let moveZ = 0;

    if (this.config.autoWalk) {
      const stairForward = this.stairGenerator.getForwardDirection(
        this.state.currentStairIndex
      );
      moveX = stairForward.x * this.config.autoWalkSpeed * this.autoWalkSpeed;
      moveZ = stairForward.z * this.config.autoWalkSpeed * this.autoWalkSpeed;
      
      const targetYaw = Math.atan2(stairForward.x, stairForward.z) + Math.PI;
      let yawDiff = targetYaw - this.state.rotation.yaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      this.state.rotation.yaw += yawDiff * Math.min(deltaTime * 3, 1);
    } else {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
        moveX += forward.x;
        moveZ += forward.z;
      }
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
        moveX -= forward.x;
        moveZ -= forward.z;
      }
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
        moveX -= right.x;
        moveZ -= right.z;
      }
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
        moveX += right.x;
        moveZ += right.z;
      }
    }

    const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (moveLength > 0) {
      moveX /= moveLength;
      moveZ /= moveLength;
      this.state.isMoving = true;
    } else {
      this.state.isMoving = false;
    }

    const speed = this.config.autoWalk 
      ? this.config.autoWalkSpeed * this.autoWalkSpeed
      : this.movementSpeed;

    const deltaX = moveX * speed * deltaTime;
    const deltaZ = moveZ * speed * deltaTime;

    const newX = this.state.position.x + deltaX;
    const newZ = this.state.position.z + deltaZ;

    const halfWidth = this.config.stepWidth / 2 - 0.2;
    const currentStep = this.stairGenerator.getStepData(this.state.currentStairIndex);
    
    const stepRotationY = currentStep.rotation.y;
    const localX = (newX - currentStep.position.x) * Math.cos(-stepRotationY) - 
                   (newZ - currentStep.position.z) * Math.sin(-stepRotationY);
    
    const clampedLocalX = Math.max(-halfWidth, Math.min(halfWidth, localX));
    
    const worldX = currentStep.position.x + 
                   clampedLocalX * Math.cos(stepRotationY) + 
                   Math.sin(stepRotationY) * (newZ - currentStep.position.z);
    const worldZ = currentStep.position.z + 
                   clampedLocalX * Math.sin(stepRotationY) - 
                   Math.cos(stepRotationY) * (newZ - currentStep.position.z);

    this.state.position.x = worldX;
    this.state.position.z = worldZ;

    const currentStair = this.stairGenerator.getStepAtPosition(
      this.state.position.x,
      this.state.position.z
    );

    if (currentStair !== null && currentStair !== this.state.currentStairIndex) {
      const stepPos = this.stairGenerator.getStepPosition(currentStair);
      this.state.position.y = stepPos.y;
      this.state.currentStairIndex = currentStair;
      
      if (this.state.currentStairIndex > this.lastStepStairIndex) {
        this.audioManager.playStepSound().catch(() => {});
        this.lastStepStairIndex = this.state.currentStairIndex;
      }
    } else if (currentStair === null) {
      const nextStair = this.state.currentStairIndex + 1;
      const nextStepPos = this.stairGenerator.getStepPosition(nextStair);
      
      const distToNext = Math.sqrt(
        Math.pow(this.state.position.x - nextStepPos.x, 2) +
        Math.pow(this.state.position.z - nextStepPos.z, 2)
      );
      
      if (distToNext < this.config.stepDepth) {
        this.state.position.y = nextStepPos.y;
        this.state.currentStairIndex = nextStair;
        
        if (this.state.currentStairIndex > this.lastStepStairIndex) {
          this.audioManager.playStepSound().catch(() => {});
          this.lastStepStairIndex = this.state.currentStairIndex;
        }
      }
    }

    if (this.state.isMoving) {
      this.headBobPhase += deltaTime * 8;
    }

    return { ...this.state };
  }

  getHeadBobOffset(): number {
    if (!this.state.isMoving) {
      return 0;
    }
    return Math.sin(this.headBobPhase) * 0.05;
  }

  getCameraPosition(): THREE.Vector3 {
    const basePos = this.state.position.clone();
    const headBob = this.getHeadBobOffset();
    
    if (this.cameraMode === 'firstPerson') {
      return new THREE.Vector3(
        basePos.x,
        basePos.y + 1.6 + headBob,
        basePos.z
      );
    } else {
      const backward = new THREE.Vector3(0, 0, 1);
      backward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.state.rotation.yaw);
      backward.multiplyScalar(5);
      
      return new THREE.Vector3(
        basePos.x + backward.x,
        basePos.y + 3 + headBob,
        basePos.z + backward.z
      );
    }
  }

  getCameraRotation(): THREE.Euler {
    if (this.cameraMode === 'firstPerson') {
      return new THREE.Euler(
        this.state.rotation.pitch,
        this.state.rotation.yaw,
        0,
        'YXZ'
      );
    } else {
      const lookAt = this.state.position.clone();
      lookAt.y += 1.6;
      const cameraPos = this.getCameraPosition();
      
      const direction = new THREE.Vector3();
      direction.subVectors(lookAt, cameraPos);
      
      return new THREE.Euler(
        Math.atan2(-direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z)),
        Math.atan2(direction.x, direction.z),
        0,
        'YXZ'
      );
    }
  }

  getState(): MovementState {
    return { ...this.state };
  }

  reset(): void {
    const initialPos = this.stairGenerator.getStepPosition(0);
    this.state = {
      position: initialPos,
      rotation: { yaw: 0, pitch: 0 },
      velocity: new THREE.Vector3(),
      currentStairIndex: 0,
      isMoving: false,
      isGrounded: true,
    };
    this.headBobPhase = 0;
    this.lastStepStairIndex = -1;
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }
}
