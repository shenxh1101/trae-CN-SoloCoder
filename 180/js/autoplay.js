class AutoPlayer {
    constructor() {
        this.isPlaying = false;
        this.tempo = 1.0;
        this.currentSheet = null;
        this.currentIndex = 0;
        this.timeouts = [];
        this.activeNotes = new Set();
        
        this.sheets = {
            twinkle: {
                name: '小星星',
                tempo: 120,
                notes: [
                    { note: 'C4', duration: 500 },
                    { note: 'C4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'A4', duration: 500 },
                    { note: 'A4', duration: 500 },
                    { note: 'G4', duration: 1000 },
                    { note: 'F4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'D4', duration: 500 },
                    { note: 'D4', duration: 500 },
                    { note: 'C4', duration: 1000 },
                    { note: 'G4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'D4', duration: 1000 },
                    { note: 'G4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'D4', duration: 1000 },
                    { note: 'C4', duration: 500 },
                    { note: 'C4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'A4', duration: 500 },
                    { note: 'A4', duration: 500 },
                    { note: 'G4', duration: 1000 },
                    { note: 'F4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'D4', duration: 500 },
                    { note: 'D4', duration: 500 },
                    { note: 'C4', duration: 1000 }
                ]
            },
            ode: {
                name: '欢乐颂',
                tempo: 100,
                notes: [
                    { note: 'E4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'D4', duration: 500 },
                    { note: 'C4', duration: 500 },
                    { note: 'C4', duration: 500 },
                    { note: 'D4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'E4', duration: 750 },
                    { note: 'D4', duration: 250 },
                    { note: 'D4', duration: 1000 },
                    { note: 'E4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'D4', duration: 500 },
                    { note: 'C4', duration: 500 },
                    { note: 'C4', duration: 500 },
                    { note: 'D4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'D4', duration: 750 },
                    { note: 'C4', duration: 250 },
                    { note: 'C4', duration: 1000 }
                ]
            },
            birthday: {
                name: '生日快乐',
                tempo: 120,
                notes: [
                    { note: 'C4', duration: 250 },
                    { note: 'C4', duration: 250 },
                    { note: 'D4', duration: 500 },
                    { note: 'C4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'E4', duration: 1000 },
                    { note: 'C4', duration: 250 },
                    { note: 'C4', duration: 250 },
                    { note: 'D4', duration: 500 },
                    { note: 'C4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'F4', duration: 1000 },
                    { note: 'C4', duration: 250 },
                    { note: 'C4', duration: 250 },
                    { note: 'C5', duration: 500 },
                    { note: 'A4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'E4', duration: 500 },
                    { note: 'D4', duration: 1000 },
                    { note: 'A#4', duration: 250 },
                    { note: 'A#4', duration: 250 },
                    { note: 'A4', duration: 500 },
                    { note: 'F4', duration: 500 },
                    { note: 'G4', duration: 500 },
                    { note: 'F4', duration: 1000 }
                ]
            }
        };
        
        this.onNotePlay = null;
        this.onNoteStop = null;
        this.onPlayStart = null;
        this.onPlayStop = null;
    }

    getSheetNames() {
        return Object.keys(this.sheets).map(key => ({
            id: key,
            name: this.sheets[key].name
        }));
    }

    setTempo(tempo) {
        this.tempo = tempo;
    }

    play(sheetId) {
        if (this.isPlaying) return;
        
        const sheet = this.sheets[sheetId];
        if (!sheet) return;
        
        this.isPlaying = true;
        this.currentSheet = sheet;
        this.currentIndex = 0;
        this.activeNotes.clear();
        
        if (this.onPlayStart) {
            this.onPlayStart();
        }
        
        this.playNextNote();
    }

    playNextNote() {
        if (!this.isPlaying || !this.currentSheet) {
            this.stop();
            return;
        }
        
        if (this.currentIndex >= this.currentSheet.notes.length) {
            setTimeout(() => {
                this.stop();
            }, 500);
            return;
        }
        
        const noteData = this.currentSheet.notes[this.currentIndex];
        const adjustedDuration = noteData.duration / this.tempo;
        
        if (this.onNotePlay) {
            this.onNotePlay(noteData.note);
        }
        this.activeNotes.add(noteData.note);
        
        const noteOffTimeout = setTimeout(() => {
            if (this.onNoteStop && this.activeNotes.has(noteData.note)) {
                this.onNoteStop(noteData.note);
                this.activeNotes.delete(noteData.note);
            }
        }, adjustedDuration * 0.9);
        
        this.timeouts.push(noteOffTimeout);
        
        this.currentIndex++;
        
        const nextNoteTimeout = setTimeout(() => {
            this.playNextNote();
        }, adjustedDuration);
        
        this.timeouts.push(nextNoteTimeout);
    }

    stop() {
        this.isPlaying = false;
        
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.timeouts = [];
        
        this.activeNotes.forEach(note => {
            if (this.onNoteStop) {
                this.onNoteStop(note);
            }
        });
        this.activeNotes.clear();
        
        if (this.onPlayStop) {
            this.onPlayStop();
        }
    }

    setOnNotePlay(callback) {
        this.onNotePlay = callback;
    }

    setOnNoteStop(callback) {
        this.onNoteStop = callback;
    }

    setOnPlayStart(callback) {
        this.onPlayStart = callback;
    }

    setOnPlayStop(callback) {
        this.onPlayStop = callback;
    }
}

const autoPlayer = new AutoPlayer();
