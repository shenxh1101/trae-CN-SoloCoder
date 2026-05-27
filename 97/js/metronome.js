class Metronome {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.isPlaying = false;
        this.bpm = 120;
        this.intervalId = null;
        this.beatCount = 0;
    }

    start() {
        if (this.isPlaying) {
            this.stop();
            return;
        }

        this.isPlaying = true;
        this.beatCount = 0;
        const intervalMs = 60000 / this.bpm;

        this.tick();
        this.intervalId = setInterval(() => {
            this.tick();
        }, intervalMs);
    }

    stop() {
        this.isPlaying = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.beatCount = 0;
    }

    tick() {
        const accent = this.beatCount % 4 === 0;
        this.audioEngine.playMetronomeClick(accent);
        this.beatCount++;
    }

    setBpm(bpm) {
        this.bpm = Math.max(40, Math.min(240, bpm));
        if (this.isPlaying) {
            this.stop();
            this.start();
        }
    }
}
