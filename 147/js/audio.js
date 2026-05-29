const AudioManager = {
    audioContext: null,

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
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

    isEnabled() {
        return Settings && Settings.data && Settings.data.soundEnabled;
    },

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.isEnabled()) return;
        this.ensureContext();
        if (!this.audioContext) return;

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

    playAttack() {
        this.playTone(200, 0.1, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(150, 0.15, 'square', 0.15), 50);
    },

    playHit() {
        this.playTone(100, 0.2, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(80, 0.1, 'square', 0.2), 30);
    },

    playHeal() {
        this.playTone(400, 0.15, 'sine', 0.2);
        setTimeout(() => this.playTone(500, 0.15, 'sine', 0.2), 100);
        setTimeout(() => this.playTone(600, 0.2, 'sine', 0.2), 200);
    },

    playDice() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.playTone(300 + Math.random() * 200, 0.05, 'square', 0.1);
            }, i * 50);
        }
    },

    playVictory() {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 0.3, 'sine', 0.2), i * 150);
        });
    },

    playDefeat() {
        const notes = [400, 350, 300, 200];
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 0.4, 'sawtooth', 0.15), i * 200);
        });
    },

    playCritical() {
        this.playTone(300, 0.1, 'square', 0.3);
        setTimeout(() => this.playTone(400, 0.1, 'square', 0.3), 80);
        setTimeout(() => this.playTone(500, 0.2, 'square', 0.3), 160);
    },

    playMiss() {
        this.playTone(150, 0.1, 'sine', 0.1);
    },

    playItem() {
        this.playTone(440, 0.1, 'sine', 0.15);
        setTimeout(() => this.playTone(550, 0.1, 'sine', 0.15), 80);
    },

    playButton() {
        this.playTone(500, 0.05, 'sine', 0.1);
    }
};
