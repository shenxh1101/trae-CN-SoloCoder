class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.reverbNode = null;
        this.reverbGain = null;
        this.dryGain = null;
        this.activeNotes = new Map();
        this.sampledBuffers = new Map();
        this.failedSamples = new Set();
        this.volume = 0.7;
        this.isMuted = false;
        this.sustainPedal = false;
        this.reverbEnabled = false;
        this.timbre = 'piano';
        this.notesList = [
            'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
            'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
        ];
        this.timbres = ['piano', 'synth', 'organ', 'guitar'];
        this.isSamplingLoaded = false;
        this.onSamplesReadyCallback = null;
        this.onProgressCallback = null;
        this.loadedCount = 0;
        this.totalSamples = this.notesList.length * this.timbres.length;
    }

    async init(onReady, onProgress) {
        if (this.audioContext) return;
        this.onSamplesReadyCallback = onReady;
        this.onProgressCallback = onProgress;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this.volume;

        this.dryGain = this.audioContext.createGain();
        this.dryGain.gain.value = 1;

        this.reverbGain = this.audioContext.createGain();
        this.reverbGain.gain.value = this.reverbEnabled ? 0.3 : 0;

        this.reverbNode = this.audioContext.createConvolver();
        this.reverbNode.buffer = this.createReverbImpulseResponse(2.5, 2.5);

        this.dryGain.connect(this.masterGain);
        this.reverbNode.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);

        await this.loadAllSamples();
    }

    reportProgress() {
        if (this.onProgressCallback) {
            const percent = (this.loadedCount / this.totalSamples) * 100;
            this.onProgressCallback(this.loadedCount, this.totalSamples, percent);
        }
    }

    async loadAllSamples() {
        this.loadedCount = 0;
        this.sampledBuffers.clear();
        this.failedSamples.clear();

        const loadPromises = [];

        this.timbres.forEach(timbre => {
            this.notesList.forEach(note => {
                loadPromises.push(this.loadSampleWithRetry(timbre, note, 2));
            });
        });

        await Promise.allSettled(loadPromises);

        this.isSamplingLoaded = true;

        if (this.onSamplesReadyCallback) {
            const failed = this.failedSamples.size;
            this.onSamplesReadyCallback(this.totalSamples - failed, this.totalSamples, failed);
        }
    }

    async loadSampleWithRetry(timbre, note, maxRetries = 2) {
        const key = `${timbre}_${note}`;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await this.loadSample(timbre, note);
                this.loadedCount++;
                this.reportProgress();
                return;
            } catch (error) {
                if (attempt === maxRetries) {
                    console.warn(`Failed to load ${timbre}/${note}.wav after ${maxRetries + 1} attempts, will use fallback synthesis`);
                    this.failedSamples.add(key);
                    this.loadedCount++;
                    this.reportProgress();
                } else {
                    await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
                }
            }
        }
    }

    async loadSample(timbre, note) {
        const key = `${timbre}_${note}`;
        if (this.sampledBuffers.has(key)) return;

        const encodedNote = encodeURIComponent(note);

        // Try FLAC first (smaller size, real recordings use FLAC), then WAV
        const extensions = ['flac', 'wav'];
        let lastError = null;

        for (const ext of extensions) {
            const url = `assets/audio/${timbre}/${encodedNote}.${ext}`;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    continue;
                }
                const arrayBuffer = await response.arrayBuffer();

                try {
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    this.sampledBuffers.set(key, audioBuffer);
                    return;
                } catch (decodeError) {
                    lastError = decodeError;
                    continue;
                }
            } catch (error) {
                lastError = error;
                continue;
            }
        }

        if (lastError) {
            throw lastError;
        }
        throw new Error(`No sample found for ${timbre}/${note}`);
    }

    createReverbImpulseResponse(duration, decay) {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }

        return impulse;
    }

    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain && !this.isMuted) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.audioContext.currentTime, 0.01);
        }
    }

    getVolume() {
        return this.volume;
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.audioContext.currentTime, 0.01);
        }
    }

    getIsMuted() {
        return this.isMuted;
    }

    setSustainPedal(enabled) {
        this.sustainPedal = enabled;
        if (!enabled) {
            this.activeNotes.forEach((activeNote, note) => {
                if (activeNote.stopTime && this.audioContext) {
                    const now = this.audioContext.currentTime;
                    activeNote.gainNode.gain.cancelScheduledValues(now);
                    activeNote.gainNode.gain.setTargetAtTime(0, now, 0.3);
                    setTimeout(() => {
                        this.cleanupNote(note);
                    }, 500);
                }
            });
        }
    }

    getSustainPedal() {
        return this.sustainPedal;
    }

    setReverbEnabled(enabled) {
        this.reverbEnabled = enabled;
        if (this.reverbGain) {
            this.reverbGain.gain.setTargetAtTime(enabled ? 0.35 : 0, this.audioContext.currentTime, 0.1);
        }
    }

    getReverbEnabled() {
        return this.reverbEnabled;
    }

    setTimbre(timbre) {
        this.timbre = timbre;
    }

    getTimbre() {
        return this.timbre;
    }

    getNoteFrequency(note) {
        const noteFrequencies = {
            'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
            'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
            'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
            'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
            'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
        };
        return noteFrequencies[note] || 440;
    }

    playNote(note, velocity = 0.8) {
        this.resumeContext();
        if (!this.audioContext || !this.dryGain || !this.reverbNode) return;

        this.stopNote(note, true);

        const key = `${this.timbre}_${note}`;
        const buffer = this.sampledBuffers.get(key);

        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;
        gainNode.connect(this.dryGain);
        gainNode.connect(this.reverbNode);

        let source;

        if (buffer && !this.failedSamples.has(key)) {
            source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(gainNode);
        } else {
            source = this.createFallbackSource(note, gainNode);
        }

        this.applyEnvelope(gainNode, now, velocity);
        source.start(now);

        this.activeNotes.set(note, { source, gainNode });
    }

    createFallbackSource(note, gainNode) {
        const source = this.audioContext.createOscillator();
        const frequency = this.getNoteFrequency(note);
        const now = this.audioContext.currentTime;

        source.type = 'triangle';
        source.frequency.value = frequency;

        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = frequency * 2;

        const osc2Gain = this.audioContext.createGain();
        osc2Gain.gain.value = 0.3;

        osc2.connect(osc2Gain);
        osc2Gain.connect(gainNode);

        source.connect(gainNode);

        const originalStart = source.start.bind(source);
        source.start = (when) => {
            originalStart(when);
            osc2.start(when);
        };

        const originalStop = source.stop.bind(source);
        source.stop = (when) => {
            try { originalStop(when); } catch(e) {}
            try { osc2.stop(when); } catch(e) {}
        };

        const originalDisconnect = source.disconnect.bind(source);
        source.disconnect = () => {
            try { originalDisconnect(); } catch(e) {}
            try { osc2.disconnect(); osc2Gain.disconnect(); } catch(e) {}
        };

        return source;
    }

    applyEnvelope(gainNode, now, velocity) {
        let attack, decay, sustain, release;

        switch (this.timbre) {
            case 'piano':
                attack = 0.003;
                decay = 0.4;
                sustain = 0.08;
                release = 0.6;
                break;
            case 'synth':
                attack = 0.015;
                decay = 0.25;
                sustain = 0.45;
                release = 0.35;
                break;
            case 'organ':
                attack = 0.06;
                decay = 0.12;
                sustain = 0.85;
                release = 0.12;
                break;
            case 'guitar':
                attack = 0.002;
                decay = 0.6;
                sustain = 0.15;
                release = 1.0;
                break;
            default:
                attack = 0.01;
                decay = 0.3;
                sustain = 0.3;
                release = 0.3;
        }

        const gain = gainNode.gain;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(0, now);
        gain.linearRampToValueAtTime(velocity, now + attack);
        gain.exponentialRampToValueAtTime(sustain * velocity, now + attack + decay);
    }

    stopNote(note, immediate = false) {
        if (!this.audioContext) return;

        const activeNote = this.activeNotes.get(note);
        if (!activeNote) return;

        const now = this.audioContext.currentTime;

        if (this.sustainPedal && !immediate) {
            activeNote.stopTime = now;
            return;
        }

        let releaseTime = 0.3;
        switch (this.timbre) {
            case 'piano': releaseTime = 0.6; break;
            case 'guitar': releaseTime = 1.0; break;
            case 'organ': releaseTime = 0.12; break;
        }

        activeNote.gainNode.gain.cancelScheduledValues(now);
        activeNote.gainNode.gain.setTargetAtTime(0, now, releaseTime / 3);

        const cleanupDelay = releaseTime * 1000 + 50;
        setTimeout(() => {
            this.cleanupNote(note);
        }, cleanupDelay);
    }

    cleanupNote(note) {
        const activeNote = this.activeNotes.get(note);
        if (activeNote) {
            try {
                activeNote.source.stop();
                activeNote.source.disconnect();
            } catch (e) {
            }
            activeNote.gainNode.disconnect();
            this.activeNotes.delete(note);
        }
    }

    stopAllNotes() {
        this.activeNotes.forEach((_, note) => {
            this.stopNote(note, true);
        });
    }

    playMetronomeClick(isStrong = false) {
        this.resumeContext();
        if (!this.audioContext || !this.masterGain) return;

        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isStrong ? 1200 : 880, now);
        osc.frequency.exponentialRampToValueAtTime(isStrong ? 600 : 440, now + 0.04);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(isStrong ? 0.6 : 0.4, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.06);

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 120);
    }
}

const audioEngine = new AudioEngine();
