class MidiHandler {
    constructor(recorder, piano, audioEngine) {
        this.recorder = recorder;
        this.piano = piano;
        this.audioEngine = audioEngine;
        this.isPlaying = false;
        this.playbackTimeouts = [];
        this.PPQN = 480;
        this.TEMPO_BPM = 120;
    }

    noteToMidi(note) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const match = note.match(/^([A-G]#?)(\d)$/);
        if (!match) return 60;
        const name = match[1];
        const octave = parseInt(match[2]);
        const semitone = noteNames.indexOf(name);
        return (octave + 1) * 12 + semitone;
    }

    midiToNote(midi) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        const name = noteNames[midi % 12];
        return name + octave;
    }

    msToTicks(ms, bpm, ppqn) {
        const microsecondsPerBeat = 60000000 / bpm;
        const ticksPerMs = (ppqn * 1000) / microsecondsPerBeat;
        return Math.round(ms * ticksPerMs);
    }

    exportToMidi() {
        const data = this.recorder.getRecordingData();
        if (data.length === 0) return;

        const ppqn = this.PPQN;
        const bpm = this.TEMPO_BPM;
        const microsecondsPerBeat = Math.round(60000000 / bpm);

        const header = this._writeUint32(0x4D546864);
        const headerChunk = [
            ...header,
            ...this._writeUint32(6),
            ...this._writeUint16(0),
            ...this._writeUint16(1),
            ...this._writeUint16(ppqn)
        ];

        const trackEvents = [];

        const tempoBytes = [
            (microsecondsPerBeat >> 16) & 0xFF,
            (microsecondsPerBeat >> 8) & 0xFF,
            microsecondsPerBeat & 0xFF
        ];
        trackEvents.push(...this._encodeVarLen(0));
        trackEvents.push(0xFF, 0x51, 0x03, ...tempoBytes);

        let prevTicks = 0;
        data.forEach(event => {
            const ticks = this.msToTicks(event.time, bpm, ppqn);
            const deltaTicks = Math.max(0, ticks - prevTicks);
            prevTicks = ticks;

            trackEvents.push(...this._encodeVarLen(deltaTicks));

            const midiNote = this.noteToMidi(event.note);
            if (event.type === 'on') {
                trackEvents.push(0x90, midiNote & 0x7F, 0x64);
            } else {
                trackEvents.push(0x80, midiNote & 0x7F, 0x00);
            }
        });

        trackEvents.push(...this._encodeVarLen(0));
        trackEvents.push(0xFF, 0x2F, 0x00);

        const trackHeader = [
            ...this._writeUint32(0x4D54726B),
            ...this._writeUint32(trackEvents.length)
        ];

        const midiFile = new Uint8Array([...headerChunk, ...trackHeader, ...trackEvents]);
        const blob = new Blob([midiFile], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'piano_recording.mid';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    _writeUint32(value) {
        return [
            (value >> 24) & 0xFF,
            (value >> 16) & 0xFF,
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }

    _writeUint16(value) {
        return [
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }

    _encodeVarLen(value) {
        if (value < 0) value = 0;
        const bytes = [];
        bytes.push(value & 0x7F);
        value >>= 7;
        while (value > 0) {
            bytes.push((value & 0x7F) | 0x80);
            value >>= 7;
        }
        bytes.reverse();
        return bytes;
    }

    importFromMidi(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const midiData = this.parseMidi(e.target.result);
                if (midiData && midiData.length > 0) {
                    this.recorder.setRecordingData(midiData);
                    if (this.onImportComplete) {
                        this.onImportComplete(midiData);
                    }
                }
            } catch (err) {
                console.error('MIDI parse error:', err);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    parseMidi(buffer) {
        const data = new Uint8Array(buffer);
        let pos = 0;

        const readUint32 = () => {
            const val = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3];
            pos += 4;
            return val;
        };

        const readUint16 = () => {
            const val = (data[pos] << 8) | data[pos + 1];
            pos += 2;
            return val;
        };

        const readVarLen = () => {
            let value = 0;
            let byte;
            do {
                if (pos >= data.length) break;
                byte = data[pos++];
                value = (value << 7) | (byte & 0x7F);
            } while (byte & 0x80);
            return value;
        };

        if (pos + 4 > data.length) return null;
        const headerTag = String.fromCharCode(data[0], data[1], data[2], data[3]);
        if (headerTag !== 'MThd') return null;
        pos = 4;
        const headerLen = readUint32();
        const format = readUint16();
        const numTracks = readUint16();
        const ppqn = readUint16();
        pos = 8 + headerLen;

        const allEvents = [];
        let tempo = 500000;

        for (let t = 0; t < numTracks && pos < data.length; t++) {
            if (pos + 8 > data.length) break;
            const trackTag = String.fromCharCode(data[pos], data[pos + 1], data[pos + 2], data[pos + 3]);
            if (trackTag !== 'MTrk') {
                pos++;
                continue;
            }
            pos += 4;
            const trackLength = readUint32();
            const trackEnd = pos + trackLength;
            let runningStatus = 0;
            let absTime = 0;

            while (pos < trackEnd && pos < data.length) {
                const deltaTime = readVarLen();
                absTime += deltaTime;

                if (pos >= data.length) break;
                let statusByte = data[pos];

                if (statusByte & 0x80) {
                    runningStatus = statusByte;
                    pos++;
                } else {
                    statusByte = runningStatus;
                }

                const command = statusByte & 0xF0;

                if (command === 0x90 && pos + 1 < data.length) {
                    const noteNum = data[pos++];
                    const velocity = data[pos++];
                    const note = this.midiToNote(noteNum);
                    const timeMs = absTime * (tempo / ppqn) / 1000;
                    if (this.piano.noteNames.includes(note)) {
                        allEvents.push({
                            note,
                            time: timeMs,
                            type: velocity > 0 ? 'on' : 'off'
                        });
                    }
                } else if (command === 0x80 && pos + 1 < data.length) {
                    const noteNum = data[pos++];
                    pos++;
                    const note = this.midiToNote(noteNum);
                    const timeMs = absTime * (tempo / ppqn) / 1000;
                    if (this.piano.noteNames.includes(note)) {
                        allEvents.push({ note, time: timeMs, type: 'off' });
                    }
                } else if (command === 0xA0 || command === 0xB0 || command === 0xE0) {
                    pos += 2;
                } else if (command === 0xC0 || command === 0xD0) {
                    pos += 1;
                } else if (statusByte === 0xFF && pos < data.length) {
                    const metaType = data[pos++];
                    const metaLen = readVarLen();
                    if (metaType === 0x51 && metaLen === 3 && pos + 2 < data.length) {
                        tempo = (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2];
                    }
                    pos += metaLen;
                } else if (statusByte === 0xF0 || statusByte === 0xF7) {
                    const sysexLen = readVarLen();
                    pos += sysexLen;
                } else {
                    pos++;
                }
            }

            pos = trackEnd;
        }

        allEvents.sort((a, b) => a.time - b.time);

        if (allEvents.length > 0) {
            const firstTime = allEvents[0].time;
            allEvents.forEach(e => e.time -= firstTime);
        }

        return allEvents;
    }

    playMidiFromData(events) {
        this.stopMidiPlayback();
        if (!events || events.length === 0) return;

        this.isPlaying = true;

        events.forEach(event => {
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

        const lastTime = events[events.length - 1].time;
        const endTimeout = setTimeout(() => {
            this.isPlaying = false;
            this.piano.clearAllHighlights();
        }, lastTime + 300);
        this.playbackTimeouts.push(endTimeout);
    }

    stopMidiPlayback() {
        this.isPlaying = false;
        this.playbackTimeouts.forEach(t => clearTimeout(t));
        this.playbackTimeouts = [];
        this.piano.clearAllHighlights();
    }
}
