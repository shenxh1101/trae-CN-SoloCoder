class AudioController {
    constructor() {
        this.soundEnabled = true;
        this.bgmEnabled = false;
        this.voiceEnabled = true;
        this.audioContext = null;
        this.initialized = false;
        
        this.bgmOscillators = [];
        this.bgmGain = null;
        this.bgmInterval = null;
        this.currentChordIndex = 0;
        this.bgmPlaying = false;
        
        this.chords = [
            [261.63, 329.63, 392.00],
            [293.66, 369.99, 440.00],
            [329.63, 415.30, 493.88],
            [349.23, 440.00, 523.25],
            [261.63, 329.63, 392.00],
            [220.00, 277.18, 329.63],
            [196.00, 246.94, 293.66],
            [246.94, 311.13, 369.99]
        ];
        
        this.chordDuration = 3000;
        this.bgmVolume = 0.015;
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    ensureAudioContext() {
        if (!this.initialized) {
            this.init();
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
            return this.audioContext.resume().then(() => true);
        }
        return Promise.resolve(!!this.audioContext);
    }

    async playSwipeSound() {
        if (!this.soundEnabled) return;
        await this.ensureAudioContext();
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(523.25, now);
        osc2.frequency.setValueAtTime(659.25, now);
        osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.08);
        osc2.frequency.exponentialRampToValueAtTime(987.77, now + 0.08);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.15);
        osc2.stop(now + 0.15);
    }

    async playPauseSound() {
        if (!this.soundEnabled) return;
        await this.ensureAudioContext();
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(330, now + 0.2);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.audioContext) return;
        
        try {
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
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
    }

    speak(text, options = {}) {
        if (!('speechSynthesis' in window) || !this.voiceEnabled) return;
        
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume !== undefined ? options.volume : 0.8;
        
        const voices = speechSynthesis.getVoices();
        const chineseVoice = voices.find(v => v.lang.includes('zh'));
        if (chineseVoice) {
            utterance.voice = chineseVoice;
        }
        
        speechSynthesis.speak(utterance);
    }

    speakPageNumber(page) {
        if (!this.voiceEnabled) return;
        
        const texts = [
            `第${page}页`,
            `现在是第${page}页`,
            `第${page}页，共${this.totalPages || '多'}页`
        ];
        const text = texts[Math.floor(Math.random() * texts.length)];
        this.speak(text);
    }

    setVoiceEnabled(enabled) {
        this.voiceEnabled = enabled;
        if (!enabled) {
            speechSynthesis.cancel();
        }
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }

    setBgmEnabled(enabled) {
        this.bgmEnabled = enabled;
        if (enabled) {
            this.startBgm();
        } else {
            this.stopBgm();
        }
    }

    async playChord(chordFrequencies, duration = 2.5) {
        if (!this.bgmEnabled) return;
        await this.ensureAudioContext();
        if (!this.audioContext || !this.bgmGain) return;
        
        const now = this.audioContext.currentTime;
        const endTime = now + duration;
        
        const currentOscillators = [];
        
        chordFrequencies.forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            osc.connect(gain);
            gain.connect(this.bgmGain);
            
            const noteVolume = this.bgmVolume * (1 - index * 0.15);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(noteVolume, now + 0.1);
            gain.gain.setValueAtTime(noteVolume * 0.8, endTime - 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, endTime);
            
            osc.start(now);
            osc.stop(endTime);
            
            currentOscillators.push(osc);
        });
        
        this.bgmOscillators.push(...currentOscillators);
        
        setTimeout(() => {
            currentOscillators.forEach(osc => {
                const idx = this.bgmOscillators.indexOf(osc);
                if (idx > -1) this.bgmOscillators.splice(idx, 1);
            });
        }, duration * 1000 + 100);
    }

    async startBgm() {
        if (!this.bgmEnabled) return;
        await this.ensureAudioContext();
        if (!this.audioContext) return;
        
        this.stopBgm();
        this.bgmPlaying = true;
        
        this.bgmGain = this.audioContext.createGain();
        this.bgmGain.gain.value = 1;
        this.bgmGain.connect(this.audioContext.destination);
        
        await this.playChord(this.chords[0], this.chordDuration / 1000);
        
        this.bgmInterval = setInterval(() => {
            if (this.bgmEnabled && this.bgmPlaying) {
                this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
                this.playChord(this.chords[this.currentChordIndex], this.chordDuration / 1000);
            }
        }, this.chordDuration);
    }

    stopBgm() {
        this.bgmPlaying = false;
        
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        
        this.bgmOscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (e) {}
        });
        this.bgmOscillators = [];
        this.currentChordIndex = 0;
        
        if (this.bgmGain) {
            try {
                this.bgmGain.disconnect();
            } catch (e) {}
            this.bgmGain = null;
        }
    }

    setTotalPages(total) {
        this.totalPages = total;
    }

    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}
