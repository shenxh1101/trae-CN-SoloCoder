class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.compressor = null;
        this.reverbNode = null;
        this.reverbGain = null;
        this.volume = 0.7;
        this.sustainEnabled = false;
        this.activeNotes = {};
        this.sustainedNotes = new Set();
        this.instrument = 'piano';
        this.instruments = {
            piano: {
                harmonics: [
                    { ratio: 1, gain: 1.0, type: 'triangle' },
                    { ratio: 2, gain: 0.4, type: 'sine' },
                    { ratio: 3, gain: 0.15, type: 'sine' },
                    { ratio: 4, gain: 0.06, type: 'sine' }
                ],
                attack: 0.005,
                decay: 0.3,
                sustainLevel: 0.2,
                release: 1.0
            },
            synth: {
                harmonics: [
                    { ratio: 1, gain: 0.8, type: 'square' },
                    { ratio: 2, gain: 0.3, type: 'sine' }
                ],
                attack: 0.02,
                decay: 0.1,
                sustainLevel: 0.5,
                release: 0.3
            },
            organ: {
                harmonics: [
                    { ratio: 0.5, gain: 0.5, type: 'sine' },
                    { ratio: 1, gain: 0.8, type: 'sawtooth' },
                    { ratio: 2, gain: 0.4, type: 'sine' },
                    { ratio: 3, gain: 0.2, type: 'sine' },
                    { ratio: 4, gain: 0.1, type: 'sine' }
                ],
                attack: 0.06,
                decay: 0.05,
                sustainLevel: 0.85,
                release: 0.15
            },
            guitar: {
                harmonics: [
                    { ratio: 1, gain: 0.9, type: 'triangle' },
                    { ratio: 2, gain: 0.5, type: 'sine' },
                    { ratio: 3, gain: 0.3, type: 'sine' },
                    { ratio: 4, gain: 0.15, type: 'sine' },
                    { ratio: 5, gain: 0.07, type: 'sine' }
                ],
                attack: 0.002,
                decay: 0.6,
                sustainLevel: 0.04,
                release: 0.5
            }
        };
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -20;
        this.compressor.knee.value = 10;
        this.compressor.ratio.value = 4;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
    }

    setVolume(vol) {
        this.volume = vol;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
        }
    }

    setSustain(enabled) {
        this.sustainEnabled = enabled;
        if (!enabled) {
            const notesToRelease = new Set(this.sustainedNotes);
            this.sustainedNotes.forEach(note => {
                this._releaseNote(note);
            });
            this.sustainedNotes.clear();
            return notesToRelease;
        }
        return new Set();
    }

    setInstrument(name) {
        if (this.instruments[name]) {
            this.instrument = name;
        }
    }

    noteToFrequency(note) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const match = note.match(/^([A-G]#?)(\d)$/);
        if (!match) return 440;
        const name = match[1];
        const octave = parseInt(match[2]);
        const semitone = noteNames.indexOf(name);
        const midiNote = (octave + 1) * 12 + semitone;
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    playNote(note) {
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        if (this.activeNotes[note]) {
            this._killNote(note);
        }

        const freq = this.noteToFrequency(note);
        const inst = this.instruments[this.instrument];
        const now = this.ctx.currentTime;

        const noteGain = this.ctx.createGain();
        noteGain.gain.setValueAtTime(0, now);
        noteGain.connect(this.masterGain);

        const oscillators = [];

        inst.harmonics.forEach(harmonic => {
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();

            osc.type = harmonic.type || 'sine';
            osc.frequency.setValueAtTime(freq * harmonic.ratio, now);

            if (harmonic.ratio > 1) {
                osc.detune.setValueAtTime(Math.random() * 4 - 2, now);
            }

            oscGain.gain.setValueAtTime(harmonic.gain, now);

            osc.connect(oscGain);
            oscGain.connect(noteGain);
            osc.start(now);

            oscillators.push({ osc, gain: oscGain });
        });

        noteGain.gain.linearRampToValueAtTime(1, now + inst.attack);
        noteGain.gain.linearRampToValueAtTime(inst.sustainLevel, now + inst.attack + inst.decay);

        this.activeNotes[note] = {
            oscillators,
            noteGain,
            sustained: false,
            startTime: now
        };
    }

    stopNote(note) {
        if (!this.activeNotes[note]) return;

        if (this.sustainEnabled) {
            this.activeNotes[note].sustained = true;
            this.sustainedNotes.add(note);
            return 'sustained';
        }

        this._releaseNote(note);
        return 'released';
    }

    _releaseNote(note) {
        const noteData = this.activeNotes[note];
        if (!noteData) return;

        const inst = this.instruments[this.instrument];
        const now = this.ctx.currentTime;

        noteData.noteGain.gain.cancelScheduledValues(now);
        noteData.noteGain.gain.setValueAtTime(noteData.noteGain.gain.value, now);
        noteData.noteGain.gain.linearRampToValueAtTime(0, now + inst.release);

        noteData.oscillators.forEach(({ osc }) => {
            try { osc.stop(now + inst.release + 0.05); } catch (e) {}
        });

        delete this.activeNotes[note];
    }

    _killNote(note) {
        const noteData = this.activeNotes[note];
        if (!noteData) return;

        const now = this.ctx.currentTime;
        noteData.noteGain.gain.cancelScheduledValues(now);
        noteData.noteGain.gain.setValueAtTime(noteData.noteGain.gain.value, now);
        noteData.noteGain.gain.linearRampToValueAtTime(0, now + 0.01);

        noteData.oscillators.forEach(({ osc }) => {
            try { osc.stop(now + 0.02); } catch (e) {}
        });

        delete this.activeNotes[note];
    }

    isNoteSustained(note) {
        return this.sustainedNotes.has(note);
    }

    playMetronomeClick(accent) {
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(accent ? 1000 : 800, now);
        gain.gain.setValueAtTime(accent ? 0.5 * this.volume : 0.3 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(accent ? 2000 : 1600, now);
        gain2.gain.setValueAtTime(accent ? 0.15 * this.volume : 0.08 * this.volume, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
        osc2.start(now);
        osc2.stop(now + 0.04);
    }
}
