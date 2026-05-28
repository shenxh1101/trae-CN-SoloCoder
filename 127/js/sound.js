let audioContext = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

const playTone = (frequency, duration, type = 'sine', volume = 0.3) => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error('Failed to play sound:', e);
  }
};

export const playSpinSound = () => {
  playTone(440, 0.15, 'sine', 0.2);
  setTimeout(() => playTone(550, 0.1, 'sine', 0.15), 100);
  setTimeout(() => playTone(660, 0.08, 'sine', 0.1), 200);
};

export const playClickSound = () => {
  playTone(800, 0.05, 'square', 0.1);
};

export const playSuccessSound = () => {
  playTone(523, 0.15, 'sine', 0.3);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 150);
  setTimeout(() => playTone(784, 0.2, 'sine', 0.3), 300);
  setTimeout(() => playTone(1047, 0.3, 'sine', 0.3), 450);
};

export const playAlignSound = () => {
  playTone(660, 0.1, 'sine', 0.25);
  setTimeout(() => playTone(880, 0.15, 'sine', 0.2), 100);
};

export const playErrorSound = () => {
  playTone(200, 0.2, 'sawtooth', 0.15);
};

export const playCompleteSound = () => {
  const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
  notes.forEach((note, i) => {
    setTimeout(() => playTone(note, 0.2, 'sine', 0.25), i * 100);
  });
  setTimeout(() => {
    [1047, 1319, 1568].forEach((note) => {
      playTone(note, 0.4, 'sine', 0.3);
    });
  }, notes.length * 100);
};

export const resumeAudioContext = () => {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
};
