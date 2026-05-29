class AudioManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.initialized) return;
        
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
    }

    playPlaceBomb() {
        this.init();
        this.playTone(300, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(400, 0.1, 'square', 0.15), 50);
    }

    playExplosion() {
        this.init();
        this.playTone(100, 0.3, 'sawtooth', 0.4);
        this.playTone(80, 0.4, 'square', 0.3);
        setTimeout(() => this.playTone(60, 0.2, 'sawtooth', 0.2), 100);
    }

    playPowerup() {
        this.init();
        this.playTone(523, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 100);
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.3), 200);
    }

    playDeath() {
        this.init();
        this.playTone(400, 0.2, 'square', 0.3);
        setTimeout(() => this.playTone(300, 0.2, 'square', 0.3), 150);
        setTimeout(() => this.playTone(200, 0.3, 'square', 0.3), 300);
    }

    playVictory() {
        this.init();
        const notes = [523, 659, 784, 1047];
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 0.2, 'sine', 0.3), i * 150);
        });
    }
}

const audioManager = new AudioManager();
