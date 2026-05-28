import { create } from 'zustand';
import { BUBBLE_DEFAULTS, COLOR_MODES, BACKGROUND_COLORS, ColorMode, BackgroundColor } from '../utils/constants';

class AudioManager {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private animationFrame: number | null = null;

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  playPopSound() {
    const ctx = this.init();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
  }

  private createAmbientLoop() {
    if (!this.audioContext || !this.isPlaying) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
    }

    this.oscillator = ctx.createOscillator();
    this.gainNode = ctx.createGain();

    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(220, now);
    this.oscillator.frequency.linearRampToValueAtTime(330, now + 4);
    this.oscillator.frequency.linearRampToValueAtTime(220, now + 8);

    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(0.05, now + 1);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    this.oscillator.start();
    this.oscillator.stop(now + 8);

    this.oscillator.onended = () => {
      if (this.isPlaying) {
        setTimeout(() => this.createAmbientLoop(), 500);
      }
    };
  }

  startMusic() {
    this.init();
    this.isPlaying = true;
    this.createAmbientLoop();
  }

  stopMusic() {
    this.isPlaying = false;
    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch (e) {}
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  get isMusicPlaying() {
    return this.isPlaying;
  }
}

const audioManager = new AudioManager();

interface BubbleState {
  bubbleCount: number;
  minSize: number;
  maxSize: number;
  floatSpeed: number;
  backgroundColor: BackgroundColor;
  colorMode: ColorMode;
  bloomEnabled: boolean;
  autoRotate: boolean;
  connectionsEnabled: boolean;
  musicEnabled: boolean;
  currentBubbleCount: number;
  audioManager: AudioManager;
  setBubbleCount: (count: number) => void;
  setMinSize: (size: number) => void;
  setMaxSize: (size: number) => void;
  setFloatSpeed: (speed: number) => void;
  setBackgroundColor: (color: BackgroundColor) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleBloom: () => void;
  toggleAutoRotate: () => void;
  toggleConnections: () => void;
  toggleMusic: () => void;
  setCurrentBubbleCount: (count: number) => void;
}

export const useBubbleStore = create<BubbleState>((set, get) => ({
  bubbleCount: BUBBLE_DEFAULTS.COUNT,
  minSize: BUBBLE_DEFAULTS.MIN_SIZE,
  maxSize: BUBBLE_DEFAULTS.MAX_SIZE,
  floatSpeed: BUBBLE_DEFAULTS.FLOAT_SPEED,
  backgroundColor: BACKGROUND_COLORS.SKY,
  colorMode: COLOR_MODES.RANDOM,
  bloomEnabled: true,
  autoRotate: false,
  connectionsEnabled: true,
  musicEnabled: false,
  currentBubbleCount: 0,
  audioManager,
  setBubbleCount: (count) => set({ bubbleCount: count }),
  setMinSize: (size) => set({ minSize: size }),
  setMaxSize: (size) => set({ maxSize: size }),
  setFloatSpeed: (speed) => set({ floatSpeed: speed }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setColorMode: (mode) => set({ colorMode: mode }),
  toggleBloom: () => set((state) => ({ bloomEnabled: !state.bloomEnabled })),
  toggleAutoRotate: () => set((state) => ({ autoRotate: !state.autoRotate })),
  toggleConnections: () => set((state) => ({ connectionsEnabled: !state.connectionsEnabled })),
  toggleMusic: () => {
    const { audioManager, musicEnabled } = get();
    if (musicEnabled) {
      audioManager.stopMusic();
    } else {
      audioManager.startMusic();
    }
    set({ musicEnabled: !musicEnabled });
  },
  setCurrentBubbleCount: (count) => set({ currentBubbleCount: count }),
}));
