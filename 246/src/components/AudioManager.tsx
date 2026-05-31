import { useEffect, useRef, useCallback } from 'react';
import { useCloudStore } from '@/store/useCloudStore';

const AUDIO_URLS: Record<string, string> = {
  guqin: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_9c0f900e02.mp3?filename=relaxing-guqin-118194.mp3',
  nature: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_0b4f83404e.mp3?filename=forest-ambient-110766.mp3',
};

export default function AudioManager() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { musicEnabled, musicType } = useCloudStore();

  const initAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
      audioRef.current.crossOrigin = 'anonymous';
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    const audio = initAudio();

    if (musicEnabled) {
      const url = AUDIO_URLS[musicType];
      if (audio.src !== url) {
        audio.src = url;
        audio.load();
      }
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.log('Audio play blocked by browser policy, waiting for user interaction:', err);
        });
      }
    } else {
      audio.pause();
    }

    return () => {
    };
  }, [musicEnabled, musicType, initAudio]);

  useEffect(() => {
    const handleUserInteraction = () => {
      const audio = initAudio();
      if (musicEnabled && audio.paused) {
        audio.play().catch(() => {});
      }
    };

    window.addEventListener('click', handleUserInteraction, { once: true });
    window.addEventListener('keydown', handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, [musicEnabled, initAudio]);

  return null;
}
