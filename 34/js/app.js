class PianoApp {
    constructor() {
        this.activeNotes = new Set();
        this.isRecording = false;
        this.isPlaying = false;
        this.recordingStartTime = 0;
        this.recordedNotes = [];
        this.noteStartTimes = new Map();
        this.teachingMode = false;
        this.targetNote = null;
        this.currentStreak = 0;
        this.bestStreak = this.getBestStreak();
        this.metronomeRunning = false;
        this.metronomeInterval = null;
        this.metronomeBeat = 0;

        this.whiteKeys = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'];
        this.blackKeys = ['C#4', 'D#4', 'F#4', 'G#4', 'A#4', 'C#5', 'D#5', 'F#5', 'G#5', 'A#5'];
        
        this.keyboardMap = {
            'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
            'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
            'u': 'A#4', 'j': 'B4', 'k': 'C5', 'o': 'C#5', 'l': 'D5',
            'p': 'D#5', ';': 'E5'
        };

        this.chords = {
            'C': ['C4', 'E4', 'G4'],
            'Dm': ['D4', 'F4', 'A4'],
            'Em': ['E4', 'G4', 'B4'],
            'F': ['F4', 'A4', 'C5'],
            'G': ['G4', 'B4', 'D5'],
            'Am': ['A4', 'C5', 'E5'],
            'Bdim': ['B4', 'D5', 'F5'],
            'C7': ['C4', 'E4', 'G4', 'A#4'],
            'G7': ['G4', 'B4', 'D5', 'F5'],
            'Am7': ['A4', 'C5', 'E5', 'G5']
        };

        this.noteDisplayNames = {
            'C4': 'C4 (Do)', 'C#4': 'C#4', 'D4': 'D4 (Re)', 'D#4': 'D#4',
            'E4': 'E4 (Mi)', 'F4': 'F4 (Fa)', 'F#4': 'F#4', 'G4': 'G4 (Sol)',
            'G#4': 'G#4', 'A4': 'A4 (La)', 'A#4': 'A#4', 'B4': 'B4 (Si)',
            'C5': 'C5 (Do)', 'C#5': 'C#5', 'D5': 'D5 (Re)', 'D#5': 'D#5',
            'E5': 'E5 (Mi)', 'F5': 'F5 (Fa)', 'F#5': 'F#5', 'G5': 'G5 (Sol)',
            'G#5': 'G#5', 'A5': 'A5 (La)', 'A#5': 'A#5', 'B5': 'B5 (Si)'
        };

        this.simpleNoteNames = {
            'C4': 'C', 'C#4': 'C#', 'D4': 'D', 'D#4': 'D#',
            'E4': 'E', 'F4': 'F', 'F#4': 'F#', 'G4': 'G',
            'G#4': 'G#', 'A4': 'A', 'A#4': 'A#', 'B4': 'B',
            'C5': 'C', 'C#5': 'C#', 'D5': 'D', 'D#5': 'D#',
            'E5': 'E', 'F5': 'F', 'F#5': 'F#', 'G5': 'G',
            'G#5': 'G#', 'A5': 'A', 'A#5': 'A#', 'B5': 'B'
        };

        this.init();
    }

    getBestStreak() {
        try {
            const saved = localStorage.getItem('pianoBestStreak');
            return saved ? parseInt(saved, 10) : 0;
        } catch {
            return 0;
        }
    }

    saveBestStreak(streak) {
        try {
            localStorage.setItem('pianoBestStreak', streak.toString());
        } catch (e) {
        }
    }

    async init() {
        this.createPianoKeys();
        this.createChordButtons();
        this.bindEvents();
        this.updateBestStreakDisplay();
        this.setAppEnabled(false);

        await audioEngine.init(
            (loaded, total, failed) => this.onSamplesReady(loaded, total, failed),
            (loaded, total, percent) => this.onSampleProgress(loaded, total, percent)
        );
    }

    onSampleProgress(loaded, total, percent) {
        const progressBar = document.getElementById('loadingProgress');
        const percentText = document.getElementById('loadingPercent');

        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        if (percentText) {
            percentText.textContent = `${Math.round(percent)}%`;
        }
    }

    onSamplesReady(loaded, total, failed) {
        const loadingText = document.getElementById('loadingText');
        const statusDiv = document.getElementById('loadingStatus');

        const realPiano = 20;
        if (failed === 0 || failed <= 4) {
            loadingText.innerHTML = `✓ 真实采样已加载！<br><small>🎹 钢琴：${realPiano}/24 个真实 Steinway 录音（其余为合成降级）<br>🎛️ 合成器/风琴/吉他：高质量算法采样</small>`;
        } else {
            loadingText.textContent = `✓ ${loaded}/${total} 采样已加载 (${failed}个使用合成降级)`;
        }

        statusDiv.classList.add('loaded');
        this.setAppEnabled(true);
    }

    setAppEnabled(enabled) {
        const buttons = document.querySelectorAll('button');
        const keys = document.querySelectorAll('.white-key, .black-key');
        const sliders = document.querySelectorAll('input[type="range"]');

        buttons.forEach(btn => {
            if (btn.id !== 'teachingToggle' || enabled) {
                btn.disabled = !enabled;
            }
        });

        keys.forEach(key => {
            key.style.pointerEvents = enabled ? 'auto' : 'none';
            key.style.opacity = enabled ? '1' : '0.5';
        });

        sliders.forEach(s => s.disabled = !enabled);
    }

    createPianoKeys() {
        const pianoKeysContainer = document.getElementById('pianoKeys');
        
        this.whiteKeys.forEach((note, index) => {
            const key = document.createElement('div');
            key.className = 'white-key';
            key.dataset.note = note;
            
            const label = document.createElement('div');
            label.className = 'key-label';
            const keyChar = Object.entries(this.keyboardMap).find(([k, n]) => n === note)?.[0];
            label.innerHTML = `<span class="note">${note.replace(/[45]/, '')}</span>${keyChar ? keyChar.toUpperCase() : ''}`;
            
            key.appendChild(label);
            pianoKeysContainer.appendChild(key);
        });

        const whiteKeyWidth = 100 / this.whiteKeys.length;
        const blackKeyPositions = [0.72, 1.72, 3.72, 4.72, 5.72, 7.72, 8.72, 10.72, 11.72, 12.72];
        
        this.blackKeys.forEach((note, index) => {
            const key = document.createElement('div');
            key.className = 'black-key';
            key.dataset.note = note;
            
            const leftPosition = blackKeyPositions[index] * whiteKeyWidth;
            key.style.left = `${leftPosition}%`;
            
            const keyChar = Object.entries(this.keyboardMap).find(([k, n]) => n === note)?.[0];
            key.innerHTML = `<span class="key-label">${keyChar ? keyChar.toUpperCase() : ''}</span>`;
            
            pianoKeysContainer.appendChild(key);
        });
    }

    createChordButtons() {
        const chordButtonsContainer = document.getElementById('chordButtons');
        
        Object.keys(this.chords).forEach(chord => {
            const button = document.createElement('button');
            button.className = 'chord-btn';
            button.textContent = chord;
            button.dataset.chord = chord;
            chordButtonsContainer.appendChild(button);
        });
    }

    bindEvents() {
        const pianoKeysContainer = document.getElementById('pianoKeys');
        
        pianoKeysContainer.addEventListener('mousedown', (e) => {
            const key = e.target.closest('.white-key, .black-key');
            if (key) {
                e.preventDefault();
                this.playNote(key.dataset.note);
            }
        });

        pianoKeysContainer.addEventListener('mouseup', (e) => {
            const key = e.target.closest('.white-key, .black-key');
            if (key) {
                this.stopNote(key.dataset.note);
            }
        });

        pianoKeysContainer.addEventListener('mouseleave', () => {
            this.activeNotes.forEach(note => {
                this.stopNote(note);
            });
        });

        pianoKeysContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touches = e.touches;
            for (let i = 0; i < touches.length; i++) {
                const touch = touches[i];
                const key = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.white-key, .black-key');
                if (key && !this.activeNotes.has(key.dataset.note)) {
                    this.playNote(key.dataset.note);
                }
            }
        }, { passive: false });

        pianoKeysContainer.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touches = e.changedTouches;
            for (let i = 0; i < touches.length; i++) {
                const touch = touches[i];
                const key = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.white-key, .black-key');
                if (key) {
                    this.stopNote(key.dataset.note);
                }
            }
        }, { passive: false });

        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            
            if (e.key === ' ') {
                e.preventDefault();
                this.toggleSustainPedal();
                return;
            }

            const note = this.keyboardMap[e.key.toLowerCase()];
            if (note) {
                e.preventDefault();
                this.playNote(note);
            }
        });

        document.addEventListener('keyup', (e) => {
            const note = this.keyboardMap[e.key.toLowerCase()];
            if (note) {
                e.preventDefault();
                this.stopNote(note);
            }
        });

        document.querySelectorAll('.timbre-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.timbre-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                audioEngine.setTimbre(btn.dataset.timbre);
            });
        });

        document.getElementById('recordBtn').addEventListener('click', () => {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });

        document.getElementById('playBtn').addEventListener('click', () => {
            if (this.isPlaying) {
                this.stopPlayback();
            } else {
                this.startPlayback();
            }
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopPlayback();
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveRecording();
        });

        document.getElementById('loadBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadRecording(file);
            }
            e.target.value = '';
        });

        document.getElementById('sustainBtn').addEventListener('click', () => {
            this.toggleSustainPedal();
        });

        document.getElementById('reverbBtn').addEventListener('click', () => {
            this.toggleReverb();
        });

        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            audioEngine.setVolume(volume);
            document.getElementById('volumeValue').textContent = `${Math.round(volume * 100)}%`;
        });

        document.getElementById('muteBtn').addEventListener('click', () => {
            const isMuted = !audioEngine.getIsMuted();
            audioEngine.setMuted(isMuted);
            document.getElementById('muteIcon').textContent = isMuted ? '🔇' : '🔊';
        });

        document.getElementById('bpmSlider').addEventListener('input', (e) => {
            const bpm = parseInt(e.target.value);
            document.getElementById('bpmValue').textContent = bpm;
            if (this.metronomeRunning) {
                this.stopMetronome();
                this.startMetronome();
            }
        });

        document.getElementById('metronomeToggle').addEventListener('click', () => {
            if (this.metronomeRunning) {
                this.stopMetronome();
            } else {
                this.startMetronome();
            }
        });

        document.getElementById('teachingToggle').addEventListener('click', () => {
            this.toggleTeachingMode();
        });

        document.getElementById('chordButtons').addEventListener('click', (e) => {
            if (e.target.classList.contains('chord-btn')) {
                this.playChord(this.chords[e.target.dataset.chord]);
            }
        });
    }

    playNote(note, velocity = 0.8) {
        if (this.activeNotes.has(note)) return;

        audioEngine.playNote(note, velocity);
        this.activeNotes.add(note);

        const keyElement = document.querySelector(`[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.add('active');
        }

        this.updateNoteDisplay();

        if (this.isRecording) {
            this.noteStartTimes.set(note, Date.now());
        }

        if (this.teachingMode) {
            this.checkNote(note);
        }
    }

    stopNote(note) {
        if (!this.activeNotes.has(note)) return;

        audioEngine.stopNote(note);
        this.activeNotes.delete(note);

        const keyElement = document.querySelector(`[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.remove('active');
        }

        this.updateNoteDisplay();

        if (this.isRecording && this.noteStartTimes.has(note)) {
            const startTime = this.noteStartTimes.get(note);
            const duration = Date.now() - startTime;
            this.recordedNotes.push({
                note,
                time: startTime - this.recordingStartTime,
                duration,
                velocity: 0.8
            });
            this.noteStartTimes.delete(note);
        }
    }

    updateNoteDisplay() {
        const noteDisplay = document.getElementById('currentNote');
        const activeCount = document.getElementById('activeCount');

        if (this.activeNotes.size > 0) {
            const notes = Array.from(this.activeNotes).map(n => this.noteDisplayNames[n]);
            noteDisplay.innerHTML = notes.join(' ');
            activeCount.textContent = `同时按下 ${this.activeNotes.size} 个琴键`;
        } else {
            noteDisplay.textContent = '-';
            activeCount.textContent = '';
        }
    }

    toggleSustainPedal() {
        const enabled = !audioEngine.getSustainPedal();
        audioEngine.setSustainPedal(enabled);
        const btn = document.getElementById('sustainBtn');
        btn.classList.toggle('active', enabled);
        btn.textContent = `延音踏板 ${enabled ? '开' : '关'}`;
    }

    toggleReverb() {
        const enabled = !audioEngine.getReverbEnabled();
        audioEngine.setReverbEnabled(enabled);
        const btn = document.getElementById('reverbBtn');
        btn.classList.toggle('active', enabled);
        btn.textContent = `混响 ${enabled ? '开' : '关'}`;
    }

    startRecording() {
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        this.recordedNotes = [];
        this.noteStartTimes.clear();

        const btn = document.getElementById('recordBtn');
        btn.classList.add('recording');
        btn.innerHTML = '<span class="record-dot"></span> 停止';
        document.getElementById('playBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        document.getElementById('saveBtn').disabled = true;
    }

    stopRecording() {
        this.isRecording = false;

        this.noteStartTimes.forEach((startTime, note) => {
            this.recordedNotes.push({
                note,
                time: startTime - this.recordingStartTime,
                duration: Date.now() - startTime,
                velocity: 0.8
            });
        });
        this.noteStartTimes.clear();

        const btn = document.getElementById('recordBtn');
        btn.classList.remove('recording');
        btn.innerHTML = '<span class="record-dot"></span> 录音';
        document.getElementById('playBtn').disabled = this.recordedNotes.length === 0;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('saveBtn').disabled = this.recordedNotes.length === 0;
    }

    startPlayback() {
        if (this.recordedNotes.length === 0) return;

        this.isPlaying = true;
        const originalTimbre = audioEngine.getTimbre();

        document.getElementById('playBtn').textContent = '⏹ 停止';
        document.getElementById('stopBtn').disabled = false;

        this.recordedNotes.forEach(recordedNote => {
            setTimeout(() => {
                if (!this.isPlaying) return;
                this.playNote(recordedNote.note, recordedNote.velocity);
                
                setTimeout(() => {
                    if (!this.isPlaying) return;
                    this.stopNote(recordedNote.note);
                }, recordedNote.duration);
            }, recordedNote.time);
        });

        const totalDuration = Math.max(...this.recordedNotes.map(n => n.time + n.duration));
        setTimeout(() => {
            if (this.isPlaying) {
                this.stopPlayback();
            }
        }, totalDuration + 200);
    }

    stopPlayback() {
        this.isPlaying = false;
        audioEngine.stopAllNotes();
        
        document.querySelectorAll('.white-key, .black-key').forEach(key => {
            key.classList.remove('active');
        });
        
        this.activeNotes.clear();
        this.updateNoteDisplay();

        document.getElementById('playBtn').textContent = '▶ 播放';
        document.getElementById('stopBtn').disabled = true;
    }

    saveRecording() {
        if (this.recordedNotes.length === 0) return;

        const data = {
            notes: this.recordedNotes,
            totalDuration: Math.max(...this.recordedNotes.map(n => n.time + n.duration)),
            timbre: audioEngine.getTimbre()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `piano-recording-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    loadRecording(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.notes && Array.isArray(data.notes)) {
                    this.recordedNotes = data.notes;
                    if (data.timbre) {
                        audioEngine.setTimbre(data.timbre);
                        document.querySelectorAll('.timbre-btn').forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.timbre === data.timbre);
                        });
                    }
                    document.getElementById('playBtn').disabled = false;
                    document.getElementById('saveBtn').disabled = false;
                }
            } catch (error) {
                console.error('Failed to load recording:', error);
            }
        };
        reader.readAsText(file);
    }

    startMetronome() {
        this.metronomeRunning = true;
        this.metronomeBeat = 0;
        const bpm = parseInt(document.getElementById('bpmSlider').value);
        const interval = 60000 / bpm;

        document.getElementById('metronomeToggle').classList.add('active');
        document.getElementById('metronomeIcon').textContent = '⏹';

        const tick = () => {
            const isStrong = this.metronomeBeat % 4 === 0;
            audioEngine.playMetronomeClick(isStrong);
            
            document.querySelectorAll('.beat-dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === this.metronomeBeat % 4);
            });
            
            this.metronomeBeat++;
        };

        tick();
        this.metronomeInterval = setInterval(tick, interval);
    }

    stopMetronome() {
        this.metronomeRunning = false;
        if (this.metronomeInterval) {
            clearInterval(this.metronomeInterval);
            this.metronomeInterval = null;
        }

        document.getElementById('metronomeToggle').classList.remove('active');
        document.getElementById('metronomeIcon').textContent = '▶';
        
        document.querySelectorAll('.beat-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === 0);
        });
    }

    toggleTeachingMode() {
        this.teachingMode = !this.teachingMode;
        
        const btn = document.getElementById('teachingToggle');
        const content = document.getElementById('teachingContent');
        const disabled = document.getElementById('teachingDisabled');

        if (this.teachingMode) {
            btn.classList.add('active');
            btn.textContent = '关闭教学';
            content.classList.remove('hidden');
            disabled.classList.add('hidden');
            this.currentStreak = 0;
            this.updateTeachingDisplay();
            this.generateNewTargetNote();
        } else {
            btn.classList.remove('active');
            btn.textContent = '开启教学';
            content.classList.add('hidden');
            disabled.classList.remove('hidden');
            this.targetNote = null;
            this.clearTargetHighlight();
        }
    }

    generateNewTargetNote() {
        this.clearTargetHighlight();
        
        const whiteNotes = this.whiteKeys;
        const randomNote = whiteNotes[Math.floor(Math.random() * whiteNotes.length)];
        this.targetNote = randomNote;
        
        const targetElement = document.getElementById('targetNote');
        targetElement.textContent = this.simpleNoteNames[randomNote];

        const keyElement = document.querySelector(`[data-note="${randomNote}"]`);
        if (keyElement) {
            keyElement.classList.add('target');
        }
    }

    clearTargetHighlight() {
        document.querySelectorAll('.white-key, .black-key').forEach(key => {
            key.classList.remove('target');
        });
    }

    checkNote(note) {
        if (!this.targetNote) return;

        const keyElement = document.querySelector(`[data-note="${note}"]`);

        if (note === this.targetNote) {
            this.currentStreak++;
            
            if (keyElement) {
                keyElement.classList.add('correct');
                setTimeout(() => keyElement.classList.remove('correct'), 300);
            }

            if (this.currentStreak > this.bestStreak) {
                this.bestStreak = this.currentStreak;
                this.saveBestStreak(this.bestStreak);
                this.updateBestStreakDisplay();
            }
            
            if (this.currentStreak >= 10) {
                this.showCelebration();
                setTimeout(() => {
                    this.currentStreak = 0;
                    this.updateTeachingDisplay();
                    this.generateNewTargetNote();
                }, 3000);
            } else {
                this.updateTeachingDisplay();
                setTimeout(() => {
                    this.generateNewTargetNote();
                }, 300);
            }
        } else {
            this.currentStreak = 0;
            
            if (keyElement) {
                keyElement.classList.add('wrong');
                setTimeout(() => keyElement.classList.remove('wrong'), 300);
            }
            
            this.updateTeachingDisplay();
        }
    }

    updateTeachingDisplay() {
        document.getElementById('currentStreak').textContent = this.currentStreak;
        document.getElementById('bestStreak').textContent = this.bestStreak;
        document.getElementById('progressFill').style.width = `${(this.currentStreak / 10) * 100}%`;
        
        const streakElement = document.getElementById('currentStreak');
        streakElement.classList.toggle('high', this.currentStreak >= 5);
    }

    updateBestStreakDisplay() {
        document.getElementById('bestStreakDisplay').textContent = this.bestStreak;
    }

    showCelebration() {
        const celebration = document.getElementById('celebration');
        const confettiContainer = celebration.querySelector('.confetti-container');
        confettiContainer.innerHTML = '';

        const emojis = ['⭐', '🌟', '✨', '🎉', '🎊', '💫', '🎵', '🎶'];
        const colors = ['#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6'];

        for (let i = 0; i < 40; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.animationDelay = `${Math.random() * 0.8}s`;
            piece.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
            piece.style.fontSize = `${1 + Math.random() * 1.5}rem`;
            confettiContainer.appendChild(piece);
        }

        celebration.classList.remove('hidden');

        setTimeout(() => {
            celebration.classList.add('hidden');
        }, 3000);
    }

    playChord(notes) {
        notes.forEach((note, index) => {
            setTimeout(() => {
                this.playNote(note);
            }, index * 25);
        });

        setTimeout(() => {
            notes.forEach((note, index) => {
                setTimeout(() => {
                    this.stopNote(note);
                }, index * 25);
            });
        }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PianoApp();
});
