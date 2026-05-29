class AudioManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  createToneBuffer(frequency, duration, type = 'sine') {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const frameCount = Math.max(1, Math.ceil(sampleRate * duration));
    const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let sample;

      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'sawtooth':
          sample = 2 * (t * frequency - Math.floor(0.5 + t * frequency));
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        case 'triangle':
          sample = Math.abs(4 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
          break;
        default:
          sample = Math.sin(2 * Math.PI * frequency * t);
      }

      const envelope = Math.exp(-3 * t / duration);
      data[i] = sample * envelope * 0.3;
    }

    return buffer;
  }

  playTone(frequency, duration, type = 'sine', volume = 0.3, delay = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.audioContext) return;

    const buffer = this.createToneBuffer(frequency, duration, type);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + delay + duration
    );

    source.start(this.audioContext.currentTime + delay);
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    
    this.playTone(523.25, 0.15, 'sine', 0.3, 0);
    this.playTone(659.25, 0.15, 'sine', 0.3, 0.1);
    this.playTone(783.99, 0.2, 'sine', 0.3, 0.2);
  }

  playError() {
    if (!this.enabled) return;
    this.init();
    
    this.playTone(200, 0.15, 'sawtooth', 0.2, 0);
    this.playTone(150, 0.2, 'sawtooth', 0.2, 0.1);
  }

  playVictory() {
    if (!this.enabled) return;
    this.init();
    
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
    notes.forEach((note, i) => {
      this.playTone(note, 0.2, 'sine', 0.25, i * 0.1);
    });

    const reversedNotes = [...notes].reverse();
    reversedNotes.forEach((note, i) => {
      this.playTone(note, 0.15, 'sine', 0.2, 0.9 + i * 0.08);
    });
  }

  playFlip() {
    if (!this.enabled) return;
    this.init();
    this.playTone(400, 0.05, 'sine', 0.2, 0);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

const audioManager = new AudioManager();
