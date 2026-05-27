class Recorder {
    constructor(piano, audioEngine) {
        this.piano = piano;
        this.audioEngine = audioEngine;
        this.isRecording = false;
        this.isPlaying = false;
        this.recordingData = [];
        this.recordStartTime = 0;
        this.playbackTimeouts = [];
    }

    startRecording() {
        this.isRecording = true;
        this.recordingData = [];
        this.recordStartTime = performance.now();
    }

    stopRecording() {
        this.isRecording = false;
    }

    recordNoteOn(note) {
        if (!this.isRecording) return;
        const time = performance.now() - this.recordStartTime;
        this.recordingData.push({ note, time, type: 'on' });
    }

    recordNoteOff(note) {
        if (!this.isRecording) return;
        const time = performance.now() - this.recordStartTime;
        this.recordingData.push({ note, time, type: 'off' });
    }

    playRecording() {
        if (this.isPlaying) {
            this.stopPlayback();
            return;
        }

        if (this.recordingData.length === 0) return;

        this.isPlaying = true;

        this.recordingData.forEach(event => {
            const timeout = setTimeout(() => {
                if (!this.isPlaying) return;
                if (event.type === 'on') {
                    this.piano.simulateNoteOn(event.note);
                } else {
                    this.piano.simulateNoteOff(event.note);
                }
            }, event.time);
            this.playbackTimeouts.push(timeout);
        });

        const lastEvent = this.recordingData[this.recordingData.length - 1];
        const endTimeout = setTimeout(() => {
            this.isPlaying = false;
            this.piano.clearAllHighlights();
        }, lastEvent.time + 200);
        this.playbackTimeouts.push(endTimeout);
    }

    stopPlayback() {
        this.isPlaying = false;
        this.playbackTimeouts.forEach(t => clearTimeout(t));
        this.playbackTimeouts = [];
        this.piano.clearAllHighlights();
    }

    getRecordingData() {
        return this.recordingData;
    }

    setRecordingData(data) {
        this.recordingData = data;
    }

    hasRecording() {
        return this.recordingData.length > 0;
    }
}
