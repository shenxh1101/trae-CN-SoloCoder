const SoundManager = {
    audioContext: null,
    enabled: true,

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    },

    ensureContext() {
        if (!this.audioContext) {
            this.init();
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    },

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;
        
        this.ensureContext();
        
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

    playMove() {
        if (!this.enabled) return;
        this.playTone(440, 0.08, 'sine', 0.15);
    },

    playPush() {
        if (!this.enabled) return;
        this.playTone(330, 0.1, 'square', 0.2);
        setTimeout(() => {
            this.playTone(220, 0.08, 'square', 0.15);
        }, 50);
    },

    playComplete() {
        if (!this.enabled) return;
        this.playTone(523, 0.15, 'sine', 0.3);
        setTimeout(() => {
            this.playTone(659, 0.15, 'sine', 0.3);
        }, 100);
        setTimeout(() => {
            this.playTone(784, 0.2, 'sine', 0.3);
        }, 200);
    },

    playWin() {
        if (!this.enabled) return;
        const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
        notes.forEach((note, i) => {
            setTimeout(() => {
                this.playTone(note, 0.2, 'sine', 0.25);
            }, i * 120);
        });
        
        setTimeout(() => {
            const chord = [523, 659, 784, 1047];
            chord.forEach(note => {
                this.playTone(note, 0.5, 'sine', 0.2);
            });
        }, notes.length * 120 + 100);
    },

    playError() {
        if (!this.enabled) return;
        this.playTone(200, 0.15, 'sawtooth', 0.2);
    },

    toggle() {
        this.enabled = !this.enabled;
        StorageManager.saveSetting('soundEnabled', this.enabled);
        return this.enabled;
    },

    setEnabled(enabled) {
        this.enabled = enabled;
    }
};
