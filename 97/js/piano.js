class Piano {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.container = document.getElementById('piano');
        this.keys = {};
        this.onNoteOn = null;
        this.onNoteOff = null;

        this.noteNames = [
            'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
            'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
        ];

        this.keyboardMap = {
            'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
            'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
            'u': 'A#4', 'j': 'B4', 'k': 'C5', 'o': 'C#5', 'l': 'D5',
            'p': 'D#5', ';': 'E5', "'": 'F5'
        };

        this.pressedKeys = new Set();
        this.sustainedKeys = new Set();
        this.mouseDownNote = null;
    }

    createKeyboard() {
        this.container.innerHTML = '';

        const whiteKeyWidth = 60;
        const whiteKeyGap = 2;
        const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const blackKeyAfter = { 'C': true, 'D': true, 'F': true, 'G': true, 'A': true };
        const octaves = [4, 5];

        const whiteKeyContainer = document.createElement('div');
        whiteKeyContainer.className = 'white-keys-container';

        const blackKeyContainer = document.createElement('div');
        blackKeyContainer.className = 'black-keys-container';

        let whiteIndex = 0;

        octaves.forEach(octave => {
            whiteNotes.forEach(note => {
                const fullNote = note + octave;
                const key = this._createWhiteKey(fullNote);
                whiteKeyContainer.appendChild(key);
                this.keys[fullNote] = key;

                if (blackKeyAfter[note]) {
                    const blackNote = note + '#' + octave;
                    const bKey = this._createBlackKey(blackNote);
                    const position = (whiteIndex * (whiteKeyWidth + whiteKeyGap)) + (whiteKeyWidth + whiteKeyGap / 2 - 18);
                    bKey.style.left = position + 'px';
                    blackKeyContainer.appendChild(bKey);
                    this.keys[blackNote] = bKey;
                }

                whiteIndex++;
            });
        });

        this.container.appendChild(whiteKeyContainer);
        this.container.appendChild(blackKeyContainer);

        this._setupMouseEvents();
        this._setupKeyboardEvents();
    }

    _createWhiteKey(note) {
        const key = document.createElement('div');
        key.className = 'key white-key';
        key.dataset.note = note;

        const shortcut = this._getKeyboardShortcut(note);
        if (shortcut) {
            const label = document.createElement('span');
            label.className = 'key-label shortcut-label';
            label.textContent = shortcut;
            key.appendChild(label);
        }

        const noteLabel = document.createElement('span');
        noteLabel.className = 'key-label note-name-label';
        noteLabel.textContent = note;
        key.appendChild(noteLabel);

        return key;
    }

    _createBlackKey(note) {
        const key = document.createElement('div');
        key.className = 'key black-key';
        key.dataset.note = note;

        const shortcut = this._getKeyboardShortcut(note);
        if (shortcut) {
            const label = document.createElement('span');
            label.className = 'key-label shortcut-label';
            label.textContent = shortcut;
            key.appendChild(label);
        }

        return key;
    }

    _getKeyboardShortcut(note) {
        for (const [key, value] of Object.entries(this.keyboardMap)) {
            if (value === note) return key.toUpperCase();
        }
        return '';
    }

    _setupMouseEvents() {
        this.container.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const key = e.target.closest('.key');
            if (!key) return;
            this.audioEngine.init();
            this.mouseDownNote = key.dataset.note;
            this.noteOn(this.mouseDownNote);
        });

        document.addEventListener('mouseup', () => {
            if (this.mouseDownNote) {
                this.noteOff(this.mouseDownNote);
                this.mouseDownNote = null;
            }
        });

        this.container.addEventListener('mouseover', (e) => {
            if (!this.mouseDownNote) return;
            const key = e.target.closest('.key');
            if (!key) return;
            const note = key.dataset.note;
            if (note !== this.mouseDownNote) {
                this.noteOff(this.mouseDownNote);
                this.mouseDownNote = note;
                this.noteOn(note);
            }
        });

        this.container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.audioEngine.init();
            Array.from(e.changedTouches).forEach(touch => {
                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                if (el && el.closest('.key')) {
                    this.noteOn(el.closest('.key').dataset.note);
                }
            });
        }, { passive: false });

        this.container.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.pressedKeys.forEach(note => {
                this.noteOff(note);
            });
        }, { passive: false });
    }

    _setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
            const key = e.key.toLowerCase();
            const note = this.keyboardMap[key];
            if (note && !this.pressedKeys.has(note)) {
                this.audioEngine.init();
                this.noteOn(note);
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            const note = this.keyboardMap[key];
            if (note) {
                this.noteOff(note);
            }
        });
    }

    noteOn(note) {
        if (this.pressedKeys.has(note)) return;
        this.pressedKeys.add(note);
        this.audioEngine.playNote(note);
        this.highlightKey(note, true);

        if (this.onNoteOn) {
            this.onNoteOn(note);
        }
    }

    noteOff(note) {
        if (!this.pressedKeys.has(note)) return;
        this.pressedKeys.delete(note);

        const result = this.audioEngine.stopNote(note);

        if (result === 'sustained') {
            this.sustainedKeys.add(note);
        } else {
            this.highlightKey(note, false);
            this.sustainedKeys.delete(note);
        }

        if (this.onNoteOff) {
            this.onNoteOff(note, result === 'sustained');
        }
    }

    releaseSustainedKeys(sustainedNotes) {
        sustainedNotes.forEach(note => {
            this.highlightKey(note, false);
            this.sustainedKeys.delete(note);
        });
    }

    highlightKey(note, active) {
        const key = this.keys[note];
        if (!key) return;
        if (active) {
            key.classList.add('active');
        } else {
            key.classList.remove('active');
        }
    }

    clearAllHighlights() {
        Object.values(this.keys).forEach(key => {
            key.classList.remove('active');
        });
    }

    simulateNoteOn(note) {
        if (!this.keys[note]) return;
        this.audioEngine.playNote(note);
        this.highlightKey(note, true);
    }

    simulateNoteOff(note) {
        if (!this.keys[note]) return;
        this.audioEngine._releaseNote(note);
        this.highlightKey(note, false);
    }
}
