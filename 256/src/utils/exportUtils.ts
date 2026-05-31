import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

export function takeScreenshot(renderer: THREE.WebGLRenderer): void {
  renderer.domElement.toBlob((blob) => {
    if (blob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `fluid-sculpture-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }, 'image/png');
}

export function exportOBJ(mesh: THREE.Mesh): void {
  const exporter = new OBJExporter();
  const result = exporter.parse(mesh);
  const blob = new Blob([result], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `fluid-sculpture-${Date.now()}.obj`;
  link.click();
  URL.revokeObjectURL(link.href);
}

declare global {
  interface Window {
    GIF: any;
  }
}

function loadGifScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.GIF) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = '/gif.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load gif.js'));
    document.head.appendChild(script);
  });
}

export class GIFRecorder {
  private renderer: THREE.WebGLRenderer;
  private frames: string[] = [];
  private isRecording: boolean = false;
  private maxFrames: number = 100;
  private frameRate: number = 10;
  private captureInterval: number = 6;
  private frameCount: number = 0;
  private onCompleteCallback: (() => void) | null = null;

  constructor(renderer: THREE.WebGLRenderer, duration: number = 10) {
    this.renderer = renderer;
    this.frameRate = 10;
    this.maxFrames = duration * this.frameRate;
    this.captureInterval = Math.max(1, Math.floor(60 / this.frameRate));
  }

  start(onComplete?: () => void): void {
    this.frames = [];
    this.isRecording = true;
    this.frameCount = 0;
    this.onCompleteCallback = onComplete || null;
  }

  captureFrame(): boolean {
    if (!this.isRecording) return false;

    this.frameCount++;
    if (this.frameCount % this.captureInterval !== 0) return true;

    if (this.frames.length >= this.maxFrames) {
      this.stop();
      return false;
    }

    try {
      const dataUrl = this.renderer.domElement.toDataURL('image/png');
      this.frames.push(dataUrl);
    } catch (e) {
      console.warn('Failed to capture frame:', e);
    }
    return true;
  }

  getProgress(): number {
    return (this.frames.length / this.maxFrames) * 100;
  }

  isComplete(): boolean {
    return this.frames.length >= this.maxFrames;
  }

  stop(): void {
    this.isRecording = false;
  }

  async save(): Promise<void> {
    this.stop();
    if (this.frames.length === 0) {
      this.onCompleteCallback?.();
      this.onCompleteCallback = null;
      return;
    }

    try {
      await loadGifScript();

      const canvas = document.createElement('canvas');
      const w = this.renderer.domElement.width;
      const h = this.renderer.domElement.height;
      const scale = Math.min(1, 480 / w);
      canvas.width = Math.floor(w * scale);
      canvas.height = Math.floor(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const gif = new window.GIF({
        workers: 2,
        quality: 15,
        width: canvas.width,
        height: canvas.height,
        workerScript: '/gif.worker.js',
      });

      for (let i = 0; i < this.frames.length; i++) {
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.src = this.frames[i];
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        gif.addFrame(ctx, { copy: true, delay: Math.round(1000 / this.frameRate) });
      }

      await new Promise<void>((resolve, reject) => {
        gif.on('finished', (blob: Blob) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `fluid-sculpture-${Date.now()}.gif`;
          link.click();
          URL.revokeObjectURL(link.href);
          resolve();
        });
        gif.on('error', (err: Error) => {
          console.error('GIF render error:', err);
          reject(err);
        });
        gif.render();
      });
    } catch (err) {
      console.error('Failed to save GIF:', err);
    }

    this.onCompleteCallback?.();
    this.onCompleteCallback = null;
  }

  isActive(): boolean {
    return this.isRecording;
  }
}
