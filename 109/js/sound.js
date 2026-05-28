const Sound = {
  audioContext: null,
  enabled: true,

  init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('Web Audio API not supported');
    }
  },

  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled || !this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  },

  playCorrect() {
    this.playTone(523.25, 0.1, 'sine', 0.4);
    setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.4), 100);
    setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.4), 200);
  },

  playWrong() {
    this.playTone(200, 0.2, 'square', 0.2);
    setTimeout(() => this.playTone(150, 0.3, 'square', 0.2), 150);
  },

  playWin() {
    const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.3), i * 100);
    });
  },

  playLose() {
    const notes = [400, 350, 300, 250, 200];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.25, 'sawtooth', 0.2), i * 150);
    });
  },

  playClick() {
    this.playTone(800, 0.05, 'sine', 0.2);
  },

  setEnabled(enabled) {
    this.enabled = enabled;
  }
};
