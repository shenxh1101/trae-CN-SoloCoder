const DemoSongs = {
    twinkle: {
        name: '小星星',
        notes: [
            { note: 'C4', duration: 400 }, { note: 'C4', duration: 400 },
            { note: 'G4', duration: 400 }, { note: 'G4', duration: 400 },
            { note: 'A4', duration: 400 }, { note: 'A4', duration: 400 },
            { note: 'G4', duration: 800 },
            { note: 'F4', duration: 400 }, { note: 'F4', duration: 400 },
            { note: 'E4', duration: 400 }, { note: 'E4', duration: 400 },
            { note: 'D4', duration: 400 }, { note: 'D4', duration: 400 },
            { note: 'C4', duration: 800 },
            { note: 'G4', duration: 400 }, { note: 'G4', duration: 400 },
            { note: 'F4', duration: 400 }, { note: 'F4', duration: 400 },
            { note: 'E4', duration: 400 }, { note: 'E4', duration: 400 },
            { note: 'D4', duration: 800 },
            { note: 'G4', duration: 400 }, { note: 'G4', duration: 400 },
            { note: 'F4', duration: 400 }, { note: 'F4', duration: 400 },
            { note: 'E4', duration: 400 }, { note: 'E4', duration: 400 },
            { note: 'D4', duration: 800 },
            { note: 'C4', duration: 400 }, { note: 'C4', duration: 400 },
            { note: 'G4', duration: 400 }, { note: 'G4', duration: 400 },
            { note: 'A4', duration: 400 }, { note: 'A4', duration: 400 },
            { note: 'G4', duration: 800 },
            { note: 'F4', duration: 400 }, { note: 'F4', duration: 400 },
            { note: 'E4', duration: 400 }, { note: 'E4', duration: 400 },
            { note: 'D4', duration: 400 }, { note: 'D4', duration: 400 },
            { note: 'C4', duration: 800 }
        ]
    },

    odeToJoy: {
        name: '欢乐颂',
        notes: [
            { note: 'E4', duration: 400 }, { note: 'E4', duration: 400 },
            { note: 'F4', duration: 400 }, { note: 'G4', duration: 400 },
            { note: 'G4', duration: 400 }, { note: 'F4', duration: 400 },
            { note: 'E4', duration: 400 }, { note: 'D4', duration: 400 },
            { note: 'C4', duration: 400 }, { note: 'C4', duration: 400 },
            { note: 'D4', duration: 400 }, { note: 'E4', duration: 400 },
            { note: 'E4', duration: 600 }, { note: 'D4', duration: 200 },
            { note: 'D4', duration: 800 },
            { note: 'E4', duration: 400 }, { note: 'E4', duration: 400 },
            { note: 'F4', duration: 400 }, { note: 'G4', duration: 400 },
            { note: 'G4', duration: 400 }, { note: 'F4', duration: 400 },
            { note: 'E4', duration: 400 }, { note: 'D4', duration: 400 },
            { note: 'C4', duration: 400 }, { note: 'C4', duration: 400 },
            { note: 'D4', duration: 400 }, { note: 'E4', duration: 400 },
            { note: 'D4', duration: 600 }, { note: 'C4', duration: 200 },
            { note: 'C4', duration: 800 }
        ]
    },

    maryHadALittleLamb: {
        name: '玛丽有只小羊羔',
        notes: [
            { note: 'E4', duration: 300 }, { note: 'D4', duration: 300 },
            { note: 'C4', duration: 300 }, { note: 'D4', duration: 300 },
            { note: 'E4', duration: 300 }, { note: 'E4', duration: 300 },
            { note: 'E4', duration: 600 },
            { note: 'D4', duration: 300 }, { note: 'D4', duration: 300 },
            { note: 'D4', duration: 600 },
            { note: 'E4', duration: 300 }, { note: 'G4', duration: 300 },
            { note: 'G4', duration: 600 },
            { note: 'E4', duration: 300 }, { note: 'D4', duration: 300 },
            { note: 'C4', duration: 300 }, { note: 'D4', duration: 300 },
            { note: 'E4', duration: 300 }, { note: 'E4', duration: 300 },
            { note: 'E4', duration: 300 }, { note: 'E4', duration: 300 },
            { note: 'D4', duration: 300 }, { note: 'D4', duration: 300 },
            { note: 'E4', duration: 300 }, { note: 'D4', duration: 300 },
            { note: 'C4', duration: 600 }
        ]
    }
};

class DemoPlayer {
    constructor(piano, audioEngine) {
        this.piano = piano;
        this.audioEngine = audioEngine;
        this.isPlaying = false;
        this.timeouts = [];
    }

    play(songKey) {
        this.stop();

        const song = DemoSongs[songKey];
        if (!song) return;

        this.isPlaying = true;
        let currentTime = 0;

        song.notes.forEach((noteData, index) => {
            const noteOnTimeout = setTimeout(() => {
                this.piano.simulateNoteOn(noteData.note);
            }, currentTime);
            this.timeouts.push(noteOnTimeout);

            const noteDuration = noteData.duration * 0.8;
            const noteOffTimeout = setTimeout(() => {
                this.piano.simulateNoteOff(noteData.note);
            }, currentTime + noteDuration);
            this.timeouts.push(noteOffTimeout);

            currentTime += noteData.duration;
        });

        const endTimeout = setTimeout(() => {
            this.isPlaying = false;
            this.piano.clearAllHighlights();
        }, currentTime + 100);
        this.timeouts.push(endTimeout);
    }

    stop() {
        this.isPlaying = false;
        this.timeouts.forEach(t => clearTimeout(t));
        this.timeouts = [];
        this.piano.clearAllHighlights();
    }
}
