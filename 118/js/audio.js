window.AudioManager = (function () {
  class AudioManager {
    constructor() {
      this.enabled = true;
      this._ctx = null;
      this._resumed = false;
      this._bindResume();
    }

    _bindResume() {
      const events = ['click', 'keydown', 'touchstart'];
      const handler = () => {
        if (this._ctx && this._ctx.state === 'suspended') {
          this._ctx.resume();
        }
        this._resumed = true;
        events.forEach((e) => document.removeEventListener(e, handler));
      };
      events.forEach((e) => document.addEventListener(e, handler, { passive: true }));
    }

    _getContext() {
      if (!this._ctx) {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this._ctx.state === 'suspended') {
        this._ctx.resume();
      }
      return this._ctx;
    }

    _createGain(ctx, volume, destination) {
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(destination || ctx.destination);
      return gain;
    }

    _createOsc(ctx, type, frequency) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency;
      return osc;
    }

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    }

    playDodge() {
      if (!this.enabled) return;
      const ctx = this._getContext();
      const now = ctx.currentTime;

      const gain = this._createGain(ctx, 0.15, ctx.destination);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      const osc = this._createOsc(ctx, 'square', 1100);
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.05);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.1);
    }

    playCrash() {
      if (!this.enabled) return;
      const ctx = this._getContext();
      const now = ctx.currentTime;

      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);

      const gain = this._createGain(ctx, 0.35, ctx.destination);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      noise.start(now);
      noise.stop(now + 0.4);

      const subOsc = this._createOsc(ctx, 'sine', 60);
      const subGain = this._createGain(ctx, 0.3, ctx.destination);
      subGain.gain.setValueAtTime(0.3, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      subOsc.connect(subGain);
      subOsc.start(now);
      subOsc.stop(now + 0.3);
    }

    playPowerup() {
      if (!this.enabled) return;
      const ctx = this._getContext();
      const now = ctx.currentTime;

      const notes = [523.25, 659.25, 783.99, 1046.5];
      const noteDuration = 0.08;
      const totalDuration = notes.length * noteDuration;

      const masterGain = this._createGain(ctx, 0.12, ctx.destination);
      masterGain.gain.setValueAtTime(0.12, now);
      masterGain.gain.setValueAtTime(0.12, now + totalDuration - 0.05);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);

      notes.forEach((freq, i) => {
        const startTime = now + i * noteDuration;
        const osc = this._createOsc(ctx, 'square', freq);
        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0, startTime);
        noteGain.gain.linearRampToValueAtTime(1, startTime + 0.01);
        noteGain.gain.setValueAtTime(1, startTime + noteDuration - 0.02);
        noteGain.gain.linearRampToValueAtTime(0, startTime + noteDuration);
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + noteDuration);
      });
    }
  }

  return AudioManager;
})();
