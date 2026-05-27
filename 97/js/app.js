class App {
    constructor() {
        this.audioEngine = new AudioEngine();
        this.piano = new Piano(this.audioEngine);
        this.recorder = new Recorder(this.piano, this.audioEngine);
        this.midiHandler = new MidiHandler(this.recorder, this.piano, this.audioEngine);
        this.metronome = new Metronome(this.audioEngine);
        this.teachingMode = new TeachingMode(this.piano);
        this.demoPlayer = new DemoPlayer(this.piano, this.audioEngine);

        this.currentNoteDisplay = null;
        this.isPlaybackActive = false;
    }

    init() {
        this.piano.createKeyboard();
        this.setupNoteCallbacks();
        this.setupUIEvents();
        this.currentNoteDisplay = document.getElementById('currentNoteDisplay');
    }

    setupNoteCallbacks() {
        this.piano.onNoteOn = (note) => {
            this.updateNoteDisplay(note);
            this.recorder.recordNoteOn(note);

            if (this.teachingMode.isActive) {
                this.teachingMode.checkAnswer(note);
            }
        };

        this.piano.onNoteOff = (note, isSustained) => {
            this.recorder.recordNoteOff(note);

            if (!isSustained) {
                setTimeout(() => {
                    if (this.piano.pressedKeys.size === 0 && this.piano.sustainedKeys.size === 0) {
                        this.currentNoteDisplay.textContent = '-';
                    } else if (this.piano.pressedKeys.size > 0) {
                        const lastKey = Array.from(this.piano.pressedKeys).pop();
                        this.currentNoteDisplay.textContent = lastKey;
                    }
                }, 50);
            }
        };
    }

    updateNoteDisplay(note) {
        if (this.currentNoteDisplay) {
            this.currentNoteDisplay.textContent = note;
            this.currentNoteDisplay.style.transform = 'scale(1.2)';
            setTimeout(() => {
                if (this.currentNoteDisplay) {
                    this.currentNoteDisplay.style.transform = 'scale(1)';
                }
            }, 150);
        }
    }

    setupUIEvents() {
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            const vol = e.target.value / 100;
            this.audioEngine.setVolume(vol);
            document.getElementById('volumeValue').textContent = e.target.value + '%';
        });

        document.getElementById('sustainBtn').addEventListener('click', () => {
            const btn = document.getElementById('sustainBtn');
            const isActive = btn.classList.toggle('active');
            const sustainedNotes = this.audioEngine.setSustain(isActive);
            if (!isActive && sustainedNotes) {
                this.piano.releaseSustainedKeys(sustainedNotes);
            }
        });

        document.getElementById('instrumentSelect').addEventListener('change', (e) => {
            this.audioEngine.setInstrument(e.target.value);
        });

        this._setupRecordingUI();
        this._setupMidiUI();
        this._setupMetronomeUI();
        this._setupTeachingUI();
        this._setupDemoUI();
    }

    _setupRecordingUI() {
        const recordBtn = document.getElementById('recordBtn');
        const stopBtn = document.getElementById('stopBtn');
        const playBtn = document.getElementById('playBtn');

        recordBtn.addEventListener('click', () => {
            this.audioEngine.init();
            this.recorder.startRecording();
            recordBtn.classList.add('recording');
            recordBtn.innerHTML = '<span class="icon">●</span> 录音中...';
            stopBtn.disabled = false;
            playBtn.disabled = true;
            document.getElementById('exportMidiBtn').disabled = true;
        });

        stopBtn.addEventListener('click', () => {
            this.recorder.stopRecording();
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<span class="icon">●</span> 录音';
            stopBtn.disabled = true;
            playBtn.disabled = false;
            document.getElementById('exportMidiBtn').disabled = false;
        });

        playBtn.addEventListener('click', () => {
            if (this.recorder.isPlaying) {
                this.recorder.stopPlayback();
                playBtn.classList.remove('playing');
                playBtn.innerHTML = '<span class="icon">▶</span> 回放';
                this.isPlaybackActive = false;
            } else {
                this.recorder.playRecording();
                playBtn.classList.add('playing');
                playBtn.innerHTML = '<span class="icon">■</span> 停止';
                this.isPlaybackActive = true;

                const duration = this._getRecordingDuration();
                setTimeout(() => {
                    playBtn.classList.remove('playing');
                    playBtn.innerHTML = '<span class="icon">▶</span> 回放';
                    this.isPlaybackActive = false;
                    this.currentNoteDisplay.textContent = '-';
                }, duration + 300);
            }
        });
    }

    _setupMidiUI() {
        document.getElementById('exportMidiBtn').addEventListener('click', () => {
            this.midiHandler.exportToMidi();
        });

        this.midiHandler.onImportComplete = (midiData) => {
            document.getElementById('playBtn').disabled = false;
            this.midiHandler.playMidiFromData(midiData);
        };

        document.getElementById('importMidiInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            this.midiHandler.importFromMidi(file);
            e.target.value = '';
        });
    }

    _setupMetronomeUI() {
        document.getElementById('metronomeToggle').addEventListener('click', () => {
            this.audioEngine.init();
            this.metronome.start();
            const btn = document.getElementById('metronomeToggle');
            if (this.metronome.isPlaying) {
                btn.innerHTML = '<span class="icon">■</span> 停止';
                btn.classList.add('playing');
            } else {
                btn.innerHTML = '<span class="icon">▶</span> 启动';
                btn.classList.remove('playing');
            }
        });

        document.getElementById('bpmInput').addEventListener('change', (e) => {
            const bpm = parseInt(e.target.value) || 120;
            this.metronome.setBpm(bpm);
            e.target.value = this.metronome.bpm;
        });
    }

    _setupTeachingUI() {
        document.getElementById('teachingToggle').addEventListener('click', () => {
            const btn = document.getElementById('teachingToggle');
            if (this.teachingMode.isActive) {
                this.teachingMode.stop();
                btn.textContent = '开始练习';
            } else {
                this.audioEngine.init();
                this.teachingMode.start();
                btn.textContent = '停止练习';
            }
        });
    }

    _setupDemoUI() {
        document.getElementById('playDemoBtn').addEventListener('click', () => {
            const songKey = document.getElementById('demoSongSelect').value;
            this.audioEngine.init();
            this.demoPlayer.play(songKey);
        });
    }

    _getRecordingDuration() {
        const data = this.recorder.getRecordingData();
        if (data.length === 0) return 0;
        return data[data.length - 1].time;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
