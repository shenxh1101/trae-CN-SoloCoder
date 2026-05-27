class SoundManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled) return;
    this.init();
    this.resume();

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  playEat() {
    this.playTone(523, 0.1, 'square', 0.2);
    setTimeout(() => this.playTone(784, 0.1, 'square', 0.15), 80);
  }

  playSpecialEat() {
    this.playTone(659, 0.08, 'sine', 0.2);
    setTimeout(() => this.playTone(880, 0.08, 'sine', 0.2), 60);
    setTimeout(() => this.playTone(1047, 0.12, 'sine', 0.2), 120);
    setTimeout(() => this.playTone(1319, 0.15, 'sine', 0.2), 200);
  }

  playDeath() {
    this.playTone(196, 0.15, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(147, 0.15, 'sawtooth', 0.3), 100);
    setTimeout(() => this.playTone(98, 0.3, 'sawtooth', 0.3), 200);
  }

  playMove() {
    this.playTone(200, 0.03, 'sine', 0.05);
  }
}

const soundManager = new SoundManager();