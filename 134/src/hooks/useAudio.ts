import { useEffect, useRef, useCallback } from 'react';
import { useOceanStore } from '@/store/useOceanStore';

export function useAudio() {
  const audioEnabled = useOceanStore((state) => state.audioEnabled);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleBubble = useCallback(() => {
    const delay = 600 + Math.random() * 1400;
    bubbleTimeoutRef.current = setTimeout(() => {
      if (!audioContextRef.current) return;
      
      const ctx = audioContextRef.current;
      const bubbleOsc = ctx.createOscillator();
      const bubbleGain = ctx.createGain();
      
      bubbleOsc.type = 'sine';
      bubbleOsc.frequency.setValueAtTime(
        600 + Math.random() * 400,
        ctx.currentTime
      );
      bubbleOsc.frequency.exponentialRampToValueAtTime(
        100,
        ctx.currentTime + 0.15
      );
      
      bubbleGain.gain.setValueAtTime(0, ctx.currentTime);
      bubbleGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      bubbleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      bubbleOsc.connect(bubbleGain);
      bubbleGain.connect(ctx.destination);
      
      bubbleOsc.start();
      bubbleOsc.stop(ctx.currentTime + 0.15);
      
      scheduleBubble();
    }, delay);
  }, []);

  useEffect(() => {
    if (audioEnabled) {
      initAudio();
    } else {
      stopAudio();
    }

    return () => {
      stopAudio();
    };
  }, [audioEnabled]);

  const initAudio = () => {
    if (audioContextRef.current) return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContext();
    const ctx = audioContextRef.current;

    const wavesGain = ctx.createGain();
    wavesGain.gain.value = 0.12;
    wavesGain.connect(ctx.destination);

    const wavesOsc = ctx.createOscillator();
    wavesOsc.type = 'sine';
    wavesOsc.frequency.value = 80;
    wavesOsc.connect(wavesGain);
    wavesOsc.start();

    const wavesLFO = ctx.createOscillator();
    wavesLFO.type = 'sine';
    wavesLFO.frequency.value = 0.2;
    const wavesLFOGain = ctx.createGain();
    wavesLFOGain.gain.value = 30;
    wavesLFO.connect(wavesLFOGain);
    wavesLFOGain.connect(wavesOsc.frequency);
    wavesLFO.start();

    oscillatorsRef.current.push(wavesOsc, wavesLFO);

    scheduleBubble();
  };

  const stopAudio = () => {
    oscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch (_) {}
    });
    oscillatorsRef.current = [];

    if (bubbleTimeoutRef.current) {
      clearTimeout(bubbleTimeoutRef.current);
      bubbleTimeoutRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  return { audioEnabled };
}
