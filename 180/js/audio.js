class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.analyser = null;
        this.oscillators = new Map();
        this.activeOscillators = new Map();
        
        this.waveformType = 'sine';
        this.amplitude = 0.5;
        this.freqOffset = 0;
        
        this.noteFrequencies = {
            'C4': 261.63,
            'C#4': 277.18,
            'D4': 293.66,
            'D#4': 311.13,
            'E4': 329.63,
            'F4': 349.23,
            'F#4': 369.99,
            'G4': 392.00,
            'G#4': 415.30,
            'A4': 440.00,
            'A#4': 466.16,
            'B4': 493.88,
            'C5': 523.25
        };
        
        this.effectsChain = null;
        this.dryGain = null;
        this.wetGain = null;
    }

    init() {
        if (this.audioContext) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.amplitude;
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        
        this.analyser.connect(this.audioContext.destination);
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    setWaveformType(type) {
        this.waveformType = type;
    }

    setAmplitude(value) {
        this.amplitude = value;
        if (this.masterGain) {
            this.masterGain.gain.value = value;
        }
    }

    setFreqOffset(value) {
        this.freqOffset = value;
    }

    getFrequency(note) {
        return this.noteFrequencies[note] + this.freqOffset;
    }

    playNote(note, duration = null) {
        if (!this.audioContext) this.init();
        this.resume();
        
        if (this.activeOscillators.has(note)) {
            this.stopNote(note);
        }
        
        const frequency = this.getFrequency(note);
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = this.waveformType;
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 0.01);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.start();
        
        this.activeOscillators.set(note, { oscillator, gainNode });
        
        if (duration) {
            setTimeout(() => this.stopNote(note), duration);
        }
        
        return frequency;
    }

    stopNote(note) {
        const noteData = this.activeOscillators.get(note);
        if (noteData) {
            const { oscillator, gainNode } = noteData;
            
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
            
            setTimeout(() => {
                try {
                    oscillator.stop();
                    oscillator.disconnect();
                    gainNode.disconnect();
                } catch (e) {}
            }, 100);
            
            this.activeOscillators.delete(note);
        }
    }

    stopAllNotes() {
        for (const note of Array.from(this.activeOscillators.keys())) {
            this.stopNote(note);
        }
    }

    getAnalyser() {
        return this.analyser;
    }

    getAudioContext() {
        return this.audioContext;
    }

    getMasterGain() {
        return this.masterGain;
    }

    connectToMaster(node) {
        if (this.masterGain) {
            this.masterGain.connect(node);
        }
    }

    getActiveOscillatorsCount() {
        return this.activeOscillators.size;
    }
}

const audioEngine = new AudioEngine();
