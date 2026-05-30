class Recorder {
    constructor() {
        this.isRecording = false;
        this.isPlaying = false;
        this.recordedNotes = [];
        this.startTime = 0;
        this.playbackIndex = 0;
        this.playbackTimeouts = [];
        this.timerInterval = null;
        
        this.onNotePlay = null;
        this.onNoteStop = null;
        this.onRecordingStart = null;
        this.onRecordingStop = null;
        this.onPlaybackStart = null;
        this.onPlaybackStop = null;
    }

    startRecording() {
        if (this.isRecording) return;
        
        this.isRecording = true;
        this.recordedNotes = [];
        this.startTime = Date.now();
        
        if (this.onRecordingStart) {
            this.onRecordingStart();
        }
        
        this.startTimer();
    }

    stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        this.stopTimer();
        
        if (this.onRecordingStop) {
            this.onRecordingStop();
        }
        
        return this.recordedNotes.length > 0;
    }

    startTimer() {
        let elapsed = 0;
        this.timerInterval = setInterval(() => {
            elapsed++;
            this.updateTimerDisplay(elapsed);
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        const display = document.getElementById('recordTime');
        if (display) {
            display.textContent = `${mins}:${secs}`;
        }
    }

    recordNoteOn(note) {
        if (!this.isRecording) return;
        
        const time = Date.now() - this.startTime;
        this.recordedNotes.push({
            type: 'on',
            note: note,
            time: time
        });
    }

    recordNoteOff(note) {
        if (!this.isRecording) return;
        
        const time = Date.now() - this.startTime;
        this.recordedNotes.push({
            type: 'off',
            note: note,
            time: time
        });
    }

    startPlayback() {
        if (this.isPlaying || this.recordedNotes.length === 0) return;
        
        this.isPlaying = true;
        this.playbackIndex = 0;
        
        if (this.onPlaybackStart) {
            this.onPlaybackStart();
        }
        
        this.playNextNote();
    }

    playNextNote() {
        if (!this.isPlaying || this.playbackIndex >= this.recordedNotes.length) {
            this.stopPlayback();
            return;
        }
        
        const event = this.recordedNotes[this.playbackIndex];
        const nextEvent = this.recordedNotes[this.playbackIndex + 1];
        
        if (event.type === 'on' && this.onNotePlay) {
            this.onNotePlay(event.note);
        } else if (event.type === 'off' && this.onNoteStop) {
            this.onNoteStop(event.note);
        }
        
        this.playbackIndex++;
        
        if (nextEvent) {
            const delay = nextEvent.time - event.time;
            const timeout = setTimeout(() => {
                this.playNextNote();
            }, delay);
            this.playbackTimeouts.push(timeout);
        } else {
            setTimeout(() => {
                this.stopPlayback();
            }, 500);
        }
    }

    stopPlayback() {
        this.isPlaying = false;
        
        this.playbackTimeouts.forEach(timeout => clearTimeout(timeout));
        this.playbackTimeouts = [];
        
        if (this.onPlaybackStop) {
            this.onPlaybackStop();
        }
    }

    hasRecording() {
        return this.recordedNotes.length > 0;
    }

    exportWAV(audioEngine, sampleRate = 44100) {
        if (this.recordedNotes.length === 0) return null;
        
        const duration = this.recordedNotes[this.recordedNotes.length - 1].time / 1000 + 1;
        const numChannels = 2;
        const numSamples = Math.floor(duration * sampleRate);
        
        const audioContext = new OfflineAudioContext(numChannels, numSamples, sampleRate);
        
        const masterGain = audioContext.createGain();
        masterGain.gain.value = 0.5;
        masterGain.connect(audioContext.destination);
        
        const activeNotes = new Map();
        
        this.recordedNotes.forEach(event => {
            const time = event.time / 1000;
            
            if (event.type === 'on') {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                osc.type = audioEngine.waveformType || 'sine';
                osc.frequency.value = audioEngine.noteFrequencies[event.note] + (audioEngine.freqOffset || 0) || 440;
                
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.3, time + 0.01);
                
                osc.connect(gain);
                gain.connect(masterGain);
                
                osc.start(time);
                
                if (!activeNotes.has(event.note)) {
                    activeNotes.set(event.note, []);
                }
                activeNotes.get(event.note).push({ osc, gain, startTime: time });
            } else if (event.type === 'off') {
                const noteList = activeNotes.get(event.note);
                if (noteList && noteList.length > 0) {
                    const noteData = noteList.shift();
                    const { osc, gain } = noteData;
                    gain.gain.linearRampToValueAtTime(0, time + 0.1);
                    osc.stop(time + 0.2);
                }
            }
        });
        
        activeNotes.forEach((noteList) => {
            noteList.forEach(({ osc, gain }) => {
                gain.gain.linearRampToValueAtTime(0, duration);
                osc.stop(duration + 0.1);
            });
        });
        
        return audioContext.startRendering().then(renderedBuffer => {
            const wavBuffer = this.audioBufferToWAV(renderedBuffer);
            return this.createDownloadLink(wavBuffer);
        });
    }

    audioBufferToWAV(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1;
        const bitDepth = 16;
        
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        
        const dataLength = buffer.length * blockAlign;
        const bufferLength = 44 + dataLength;
        
        const arrayBuffer = new ArrayBuffer(bufferLength);
        const view = new DataView(arrayBuffer);
        
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);
        
        const channels = [];
        for (let i = 0; i < numChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }
        
        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, channels[channel][i]));
                const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, intSample, true);
                offset += 2;
            }
        }
        
        return arrayBuffer;
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    createDownloadLink(arrayBuffer) {
        const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `piano_recording_${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    }

    setOnNotePlay(callback) {
        this.onNotePlay = callback;
    }

    setOnNoteStop(callback) {
        this.onNoteStop = callback;
    }

    setOnRecordingStart(callback) {
        this.onRecordingStart = callback;
    }

    setOnRecordingStop(callback) {
        this.onRecordingStop = callback;
    }

    setOnPlaybackStart(callback) {
        this.onPlaybackStart = callback;
    }

    setOnPlaybackStop(callback) {
        this.onPlaybackStop = callback;
    }
}

const recorder = new Recorder();
