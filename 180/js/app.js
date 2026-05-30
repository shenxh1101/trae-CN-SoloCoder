document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    audioEngine.init();
    
    const masterGain = audioEngine.getMasterGain();
    const analyser = audioEngine.getAnalyser();
    
    audioEffects.init(audioEngine.getAudioContext(), masterGain, analyser);
    
    visualizer.init('waveformCanvas', analyser);
    visualizer.start();
    
    pianoKeyboard.init();
    pianoKeyboard.setOnNotePlay(handleNotePlay);
    pianoKeyboard.setOnNoteStop(handleNoteStop);
    
    recorder.setOnNotePlay(handleNotePlay);
    recorder.setOnNoteStop(handleNoteStop);
    recorder.setOnRecordingStart(handleRecordingStart);
    recorder.setOnRecordingStop(handleRecordingStop);
    recorder.setOnPlaybackStart(handlePlaybackStart);
    recorder.setOnPlaybackStop(handlePlaybackStop);
    
    autoPlayer.setOnNotePlay(handleNotePlay);
    autoPlayer.setOnNoteStop(handleNoteStop);
    autoPlayer.setOnPlayStart(handleAutoPlayStart);
    autoPlayer.setOnPlayStop(handleAutoPlayStop);
    
    setupControls();
    
    document.addEventListener('click', initAudioOnFirstInteraction, { once: true });
    document.addEventListener('keydown', initAudioOnFirstInteraction, { once: true });
    document.addEventListener('touchstart', initAudioOnFirstInteraction, { once: true });
}

function initAudioOnFirstInteraction() {
    audioEngine.resume();
}

function handleNotePlay(note) {
    const frequency = audioEngine.playNote(note);
    visualizer.setCurrentFrequency(frequency);
    pianoKeyboard.highlightKey(note);
    recorder.recordNoteOn(note);
}

function handleNoteStop(note) {
    audioEngine.stopNote(note);
    pianoKeyboard.unhighlightKey(note);
    recorder.recordNoteOff(note);
    
    setTimeout(() => {
        if (audioEngine.getActiveOscillatorsCount() === 0) {
            visualizer.setCurrentFrequency(null);
        }
    }, 100);
}

function setupControls() {
    const waveformType = document.getElementById('waveformType');
    waveformType.addEventListener('change', (e) => {
        audioEngine.setWaveformType(e.target.value);
    });
    
    const amplitude = document.getElementById('amplitude');
    const ampValue = document.getElementById('ampValue');
    amplitude.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        ampValue.textContent = value.toFixed(1);
        audioEngine.setAmplitude(value);
    });
    
    const freqOffset = document.getElementById('freqOffset');
    const offsetValue = document.getElementById('offsetValue');
    freqOffset.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        offsetValue.textContent = value;
        audioEngine.setFreqOffset(value);
    });
    
    const reverbEnabled = document.getElementById('reverbEnabled');
    reverbEnabled.addEventListener('change', (e) => {
        audioEffects.setReverbEnabled(e.target.checked);
    });
    
    const reverbWet = document.getElementById('reverbWet');
    const reverbWetValue = document.getElementById('reverbWetValue');
    reverbWet.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        reverbWetValue.textContent = value.toFixed(1);
        audioEffects.setReverbWet(value);
    });
    
    const delayEnabled = document.getElementById('delayEnabled');
    delayEnabled.addEventListener('change', (e) => {
        audioEffects.setDelayEnabled(e.target.checked);
    });
    
    const delayWet = document.getElementById('delayWet');
    const delayWetValue = document.getElementById('delayWetValue');
    delayWet.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        delayWetValue.textContent = value.toFixed(1);
        audioEffects.setDelayWet(value);
    });
    
    const delayTime = document.getElementById('delayTime');
    const delayTimeValue = document.getElementById('delayTimeValue');
    delayTime.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        delayTimeValue.textContent = value.toFixed(1);
        audioEffects.setDelayTime(value);
    });
    
    const recordBtn = document.getElementById('recordBtn');
    const playBtn = document.getElementById('playBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    recordBtn.addEventListener('click', () => {
        if (recorder.isRecording) {
            recorder.stopRecording();
        } else {
            if (recorder.isPlaying) {
                recorder.stopPlayback();
            }
            recorder.startRecording();
        }
    });
    
    playBtn.addEventListener('click', () => {
        if (recorder.isPlaying) {
            recorder.stopPlayback();
        } else {
            recorder.startPlayback();
        }
    });
    
    exportBtn.addEventListener('click', () => {
        recorder.exportWAV(audioEngine);
    });
    
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    const stopAutoPlayBtn = document.getElementById('stopAutoPlayBtn');
    const sheetMusic = document.getElementById('sheetMusic');
    const tempo = document.getElementById('tempo');
    const tempoValue = document.getElementById('tempoValue');
    
    autoPlayBtn.addEventListener('click', () => {
        const selectedSheet = sheetMusic.value;
        autoPlayer.play(selectedSheet);
    });
    
    stopAutoPlayBtn.addEventListener('click', () => {
        autoPlayer.stop();
    });
    
    tempo.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        tempoValue.textContent = value.toFixed(1);
        autoPlayer.setTempo(value);
    });
}

function handleRecordingStart() {
    const recordBtn = document.getElementById('recordBtn');
    recordBtn.classList.add('recording');
    recordBtn.innerHTML = '<span class="record-dot"></span>停止';
    
    const playBtn = document.getElementById('playBtn');
    const exportBtn = document.getElementById('exportBtn');
    playBtn.disabled = true;
    exportBtn.disabled = true;
}

function handleRecordingStop() {
    const recordBtn = document.getElementById('recordBtn');
    recordBtn.classList.remove('recording');
    recordBtn.innerHTML = '<span class="record-dot"></span>录音';
    
    const playBtn = document.getElementById('playBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    if (recorder.hasRecording()) {
        playBtn.disabled = false;
        exportBtn.disabled = false;
    }
    
    document.getElementById('recordTime').textContent = '00:00';
}

function handlePlaybackStart() {
    const playBtn = document.getElementById('playBtn');
    playBtn.textContent = '■ 停止';
    
    const recordBtn = document.getElementById('recordBtn');
    recordBtn.disabled = true;
}

function handlePlaybackStop() {
    const playBtn = document.getElementById('playBtn');
    playBtn.textContent = '▶ 回放';
    
    const recordBtn = document.getElementById('recordBtn');
    recordBtn.disabled = false;
    
    pianoKeyboard.stopAllNotes();
}

function handleAutoPlayStart() {
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    const stopAutoPlayBtn = document.getElementById('stopAutoPlayBtn');
    const sheetMusic = document.getElementById('sheetMusic');
    const tempo = document.getElementById('tempo');
    
    autoPlayBtn.disabled = true;
    stopAutoPlayBtn.disabled = false;
    sheetMusic.disabled = true;
    tempo.disabled = true;
    
    const recordBtn = document.getElementById('recordBtn');
    const playBtn = document.getElementById('playBtn');
    recordBtn.disabled = true;
    playBtn.disabled = true;
}

function handleAutoPlayStop() {
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    const stopAutoPlayBtn = document.getElementById('stopAutoPlayBtn');
    const sheetMusic = document.getElementById('sheetMusic');
    const tempo = document.getElementById('tempo');
    
    autoPlayBtn.disabled = false;
    stopAutoPlayBtn.disabled = true;
    sheetMusic.disabled = false;
    tempo.disabled = false;
    
    const recordBtn = document.getElementById('recordBtn');
    const playBtn = document.getElementById('playBtn');
    recordBtn.disabled = false;
    
    if (recorder.hasRecording()) {
        playBtn.disabled = false;
    }
    
    pianoKeyboard.stopAllNotes();
}
