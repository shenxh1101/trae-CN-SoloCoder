const AudioManager = (() => {
  let ctx = null;

  function getContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctx;
  }

  function playTone(frequency, startTime, duration, type, volume) {
    try {
      const c = getContext();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(volume || 0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {}
  }

  function playCorrect() {
    const c = getContext();
    const now = c.currentTime;
    const chord = [523.25, 659.25, 783.99];
    chord.forEach((freq, i) => {
      playTone(freq, now + i * 0.08, 0.25, 'triangle', 0.22);
    });
    playTone(1046.50, now + 0.25, 0.4, 'triangle', 0.25);
  }

  function playWrong() {
    const c = getContext();
    const now = c.currentTime;
    playTone(180, now, 0.15, 'sawtooth', 0.18);
    playTone(140, now + 0.08, 0.2, 'sawtooth', 0.15);
  }

  function playVictory() {
    const c = getContext();
    const now = c.currentTime;

    const melody = [
      { f: 523.25, t: 0.00, d: 0.22, type: 'triangle', v: 0.2 },
      { f: 587.33, t: 0.08, d: 0.22, type: 'triangle', v: 0.2 },
      { f: 659.25, t: 0.16, d: 0.22, type: 'triangle', v: 0.2 },
      { f: 783.99, t: 0.24, d: 0.35, type: 'triangle', v: 0.22 },

      { f: 659.25, t: 0.48, d: 0.2, type: 'triangle', v: 0.2 },
      { f: 783.99, t: 0.58, d: 0.4, type: 'triangle', v: 0.24 },
      { f: 1046.50, t: 0.72, d: 0.6, type: 'triangle', v: 0.26 },
    ];

    melody.forEach(note => {
      playTone(note.f, now + note.t, note.d, note.type, note.v);
    });

    const chordNotes = [261.63, 329.63, 392.00, 523.25];
    chordNotes.forEach(freq => {
      playTone(freq, now + 0.72, 0.8, 'sine', 0.08);
    });

    for (let i = 0; i < 3; i++) {
      playTone(1046.50, now + 0.72 + i * 0.12, 0.1, 'triangle', 0.15 - i * 0.03);
    }
  }

  function playHint() {
    const c = getContext();
    const now = c.currentTime;

    playTone(660, now, 0.12, 'sine', 0.18);
    playTone(880, now + 0.1, 0.12, 'sine', 0.18);
    playTone(1100, now + 0.22, 0.2, 'sine', 0.22);

    playTone(660, now + 0.05, 0.08, 'triangle', 0.1);
    playTone(880, now + 0.15, 0.08, 'triangle', 0.1);
  }

  let enabled = true;

  return {
    playCorrect() { if (enabled) { getContext(); playCorrect(); } },
    playWrong() { if (enabled) { getContext(); playWrong(); } },
    playVictory() { if (enabled) { getContext(); playVictory(); } },
    playHint() { if (enabled) { getContext(); playHint(); } },
    toggle() { enabled = !enabled; return enabled; },
    isEnabled() { return enabled; },
    resume() {
      if (ctx && ctx.state === 'suspended') ctx.resume();
    }
  };
})();
