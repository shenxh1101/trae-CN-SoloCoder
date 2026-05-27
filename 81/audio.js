const Audio = (function() {
    let audioContext = null;
    let enabled = true;
    let initialized = false;

    function initAudioContext() {
        if (initialized) return;
        
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioContext = new AudioContextClass();
                initialized = true;
            }
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            enabled = false;
        }
    }

    function resumeAudioContext() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch(() => {});
        }
    }

    function playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!enabled) return;
        
        initAudioContext();
        resumeAudioContext();
        
        if (!audioContext) return;
        
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            const now = audioContext.currentTime;
            gainNode.gain.setValueAtTime(volume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            oscillator.start(now);
            oscillator.stop(now + duration);
        } catch (e) {
            console.warn('Audio playback failed:', e);
        }
    }

    function playMove() {
        if (!enabled) return;
        playTone(440, 0.08, 'sine', 0.15);
    }

    function playMerge() {
        if (!enabled) return;
        playTone(523, 0.08, 'sine', 0.2);
        setTimeout(() => playTone(659, 0.08, 'sine', 0.2), 40);
    }

    function playWin() {
        if (!enabled) return;
        const notes = [523, 659, 784, 1047];
        notes.forEach((note, i) => {
            setTimeout(() => playTone(note, 0.15, 'sine', 0.2), i * 120);
        });
    }

    function playGameOver() {
        if (!enabled) return;
        const notes = [392, 349, 330, 262];
        notes.forEach((note, i) => {
            setTimeout(() => playTone(note, 0.2, 'sine', 0.2), i * 180);
        });
    }

    function playMilestone() {
        if (!enabled) return;
        const notes = [523, 659, 784, 880, 1047];
        notes.forEach((note, i) => {
            setTimeout(() => playTone(note, 0.12, 'sine', 0.2), i * 80);
        });
    }

    function toggle() {
        if (!initialized && enabled) {
            initAudioContext();
        }
        enabled = !enabled;
        Storage.saveSoundEnabled(enabled);
        return enabled;
    }

    function isEnabled() {
        return enabled;
    }

    function setEnabled(value) {
        enabled = value;
        if (value && !initialized) {
            initAudioContext();
        }
    }

    document.addEventListener('click', initAudioContext, { once: true });
    document.addEventListener('touchstart', initAudioContext, { once: true, passive: true });
    document.addEventListener('keydown', initAudioContext, { once: true });

    return {
        playMove,
        playMerge,
        playWin,
        playGameOver,
        playMilestone,
        toggle,
        isEnabled,
        setEnabled,
        initAudioContext
    };
})();
