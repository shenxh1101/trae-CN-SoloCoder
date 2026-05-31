export type FootstepStyle = 'stone' | 'wood' | 'metal' | 'glass';

interface AudioBufferCache {
  stone: AudioBuffer[];
  wood: AudioBuffer[];
  metal: AudioBuffer[];
  glass: AudioBuffer[];
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private lastStepTime: number = 0;
  private stepInterval: number = 250;
  private masterGain: GainNode | null = null;
  private buffers: AudioBufferCache = { stone: [], wood: [], metal: [], glass: [] };
  private currentStyle: FootstepStyle = 'stone';
  private loadingPromise: Promise<void> | null = null;
  private loadError: boolean = false;
  private activeSources: Array<{ source: AudioBufferSourceNode; gain: GainNode }> = [];

  constructor(enabled: boolean = true, volume: number = 0.5) {
    this.enabled = enabled;
    this.volume = volume;
    this.loadingPromise = this.loadAllSounds();
  }

  private async loadAllSounds(): Promise<void> {
    try {
      const styles: FootstepStyle[] = ['stone', 'wood', 'metal', 'glass'];
      
      for (const style of styles) {
        const buffers: AudioBuffer[] = [];
        for (let i = 1; i <= 3; i++) {
          try {
            const buffer = await this.loadAudioFile(`/assets/footstep_${style}_${i}.wav`);
            if (buffer) buffers.push(buffer);
          } catch (e) {
            console.warn(`Failed to load footstep_${style}_${i}.wav`);
          }
        }
        this.buffers[style] = buffers;
      }
      
      const totalLoaded = Object.values(this.buffers).reduce((s, b) => s + b.length, 0);
      if (totalLoaded === 0) {
        this.loadError = true;
        console.warn('所有脚步声文件加载失败，将使用合成音效');
      } else {
        console.log(`✓ 已加载 ${totalLoaded} 个脚步声文件`);
      }
    } catch (error) {
      this.loadError = true;
      console.error('加载音效失败:', error);
    }
  }

  private async loadAudioFile(url: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      await this.initContext();
    }
    if (!this.audioContext) return null;

    const response = await fetch(url);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  private async initContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.enabled ? this.volume : 0;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  setFootstepStyle(style: FootstepStyle): void {
    this.currentStyle = style;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      
      if (enabled) {
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.08);
      } else {
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0, now + 0.05);
      }
    }
  }

  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.volume = clampedVolume;
    
    if (this.masterGain && this.audioContext && this.enabled) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(clampedVolume, now + 0.08);
    }
  }

  setStepInterval(interval: number): void {
    this.stepInterval = Math.max(100, interval);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }

  getFootstepStyle(): FootstepStyle {
    return this.currentStyle;
  }

  private playSyntheticStep(): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const nowTime = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(180 + Math.random() * 40, nowTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, nowTime + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, nowTime);
    filter.Q.setValueAtTime(1, nowTime);

    gainNode.gain.setValueAtTime(0, nowTime);
    gainNode.gain.linearRampToValueAtTime(0.3, nowTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, nowTime + 0.15);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(nowTime);
    oscillator.stop(nowTime + 0.15);

    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gainNode.disconnect();
    };
  }

  async playStepSound(): Promise<void> {
    if (!this.enabled) return;
    
    const now = performance.now();
    if (now - this.lastStepTime < this.stepInterval) return;
    this.lastStepTime = now;

    await this.initContext();
    if (!this.audioContext || !this.masterGain) return;

    if (this.loadingPromise) {
      await this.loadingPromise;
      this.loadingPromise = null;
    }

    const styleBuffers = this.buffers[this.currentStyle];
    
    if (!this.loadError && styleBuffers && styleBuffers.length > 0) {
      const bufferIndex = Math.floor(Math.random() * styleBuffers.length);
      const buffer = styleBuffers[bufferIndex];
      
      const ctx = this.audioContext;
      const nowTime = ctx.currentTime;

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      source.buffer = buffer;
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000 + Math.random() * 1000, nowTime);
      
      const volumeVariation = 0.85 + Math.random() * 0.3;
      const pitchVariation = 0.95 + Math.random() * 0.1;
      source.playbackRate.value = pitchVariation;

      gainNode.gain.setValueAtTime(0, nowTime);
      gainNode.gain.linearRampToValueAtTime(volumeVariation, nowTime + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, nowTime + buffer.duration);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      const activeEntry = { source, gain: gainNode };
      this.activeSources.push(activeEntry);

      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gainNode.disconnect();
        const idx = this.activeSources.indexOf(activeEntry);
        if (idx > -1) this.activeSources.splice(idx, 1);
      };

      source.start(nowTime);
    } else {
      this.playSyntheticStep();
    }
  }

  playLandSound(): void {
    if (!this.enabled) return;
    this.playStepSound();
  }

  stopAllSounds(): void {
    if (this.audioContext && this.masterGain) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0, now);
    }
    
    for (const { source, gain } of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
        gain.disconnect();
      } catch (e) {}
    }
    this.activeSources = [];
  }

  dispose(): void {
    this.stopAllSounds();
    
    setTimeout(() => {
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
        this.masterGain = null;
      }
      this.buffers = { stone: [], wood: [], metal: [], glass: [] };
    }, 100);
  }
}
