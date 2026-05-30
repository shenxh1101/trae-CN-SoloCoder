class PianoKeyboard {
    constructor() {
        this.keys = [];
        this.activeKeys = new Set();
        this.keyMap = {};
        this.noteMap = {};
        this.onNotePlay = null;
        this.onNoteStop = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        const piano = document.getElementById('piano');
        this.keys = Array.from(piano.querySelectorAll('.key'));
        
        this.keys.forEach(key => {
            const note = key.dataset.note;
            const keyChar = key.dataset.key;
            
            this.keyMap[keyChar] = note;
            this.noteMap[note] = key;
            
            this.setupKeyEvents(key);
        });
        
        this.setupKeyboardEvents();
        this.setupTouchEvents();
        
        this.isInitialized = true;
    }

    setupKeyEvents(key) {
        key.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const note = key.dataset.note;
            this.playNote(note);
        });
        
        key.addEventListener('mouseup', (e) => {
            e.preventDefault();
            const note = key.dataset.note;
            this.stopNote(note);
        });
        
        key.addEventListener('mouseleave', (e) => {
            const note = key.dataset.note;
            if (this.activeKeys.has(note)) {
                this.stopNote(note);
            }
        });
    }

    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            
            const keyChar = e.key.toLowerCase();
            if (this.keyMap[keyChar]) {
                const note = this.keyMap[keyChar];
                if (!this.activeKeys.has(note)) {
                    this.playNote(note);
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const keyChar = e.key.toLowerCase();
            if (this.keyMap[keyChar]) {
                const note = this.keyMap[keyChar];
                this.stopNote(note);
            }
        });
    }

    setupTouchEvents() {
        const piano = document.getElementById('piano');
        
        piano.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touches = Array.from(e.changedTouches);
            
            touches.forEach(touch => {
                const key = this.getKeyFromTouch(touch);
                if (key) {
                    const note = key.dataset.note;
                    if (!this.activeKeys.has(note)) {
                        this.playNote(note);
                    }
                }
            });
        }, { passive: false });
        
        piano.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touches = Array.from(e.changedTouches);
            
            touches.forEach(touch => {
                const key = this.getKeyFromTouch(touch);
                if (key) {
                    const note = key.dataset.note;
                    
                    if (!this.activeKeys.has(note)) {
                        this.playNote(note);
                    }
                }
            });
            
            this.cleanupTouches(e);
        }, { passive: false });
        
        piano.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touches = Array.from(e.changedTouches);
            
            touches.forEach(touch => {
                const key = this.getKeyFromTouch(touch);
                if (key) {
                    const note = key.dataset.note;
                    this.stopNote(note);
                }
            });
        }, { passive: false });
        
        piano.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.stopAllNotes();
        }, { passive: false });
    }

    getKeyFromTouch(touch) {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!element) return null;
        
        const key = element.closest('.key');
        return key;
    }

    cleanupTouches(e) {
        const activeTouches = new Set();
        const touches = Array.from(e.touches);
        
        touches.forEach(touch => {
            const key = this.getKeyFromTouch(touch);
            if (key) {
                activeTouches.add(key.dataset.note);
            }
        });
        
        this.activeKeys.forEach(note => {
            if (!activeTouches.has(note)) {
                this.stopNote(note);
            }
        });
    }

    playNote(note) {
        if (this.activeKeys.has(note)) return;
        
        this.activeKeys.add(note);
        
        const key = this.noteMap[note];
        if (key) {
            key.classList.add('active');
        }
        
        if (this.onNotePlay) {
            this.onNotePlay(note);
        }
    }

    stopNote(note) {
        if (!this.activeKeys.has(note)) return;
        
        this.activeKeys.delete(note);
        
        const key = this.noteMap[note];
        if (key) {
            key.classList.remove('active');
        }
        
        if (this.onNoteStop) {
            this.onNoteStop(note);
        }
    }

    stopAllNotes() {
        Array.from(this.activeKeys).forEach(note => {
            this.stopNote(note);
        });
    }

    highlightKey(note) {
        const key = this.noteMap[note];
        if (key) {
            key.classList.add('active');
        }
    }

    unhighlightKey(note) {
        const key = this.noteMap[note];
        if (key) {
            key.classList.remove('active');
        }
    }

    setOnNotePlay(callback) {
        this.onNotePlay = callback;
    }

    setOnNoteStop(callback) {
        this.onNoteStop = callback;
    }
}

const pianoKeyboard = new PianoKeyboard();
