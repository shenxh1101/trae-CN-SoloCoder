import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function MusicPlayer() {
  const isMusicMuted = useStore((s) => s.isMusicMuted);
  const toggleMusicMuted = useStore((s) => s.toggleMusicMuted);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio(
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    );
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;

    const handleCanPlay = () => setIsLoaded(true);
    audioRef.current.addEventListener('canplay', handleCanPlay);

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('canplay', handleCanPlay);
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isMusicMuted) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  }, [isMusicMuted]);

  return (
    <button
      onClick={toggleMusicMuted}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all duration-300 p-4 rounded-full border border-white/30 shadow-lg"
      disabled={!isLoaded}
      title={isMusicMuted ? '播放音乐' : '静音'}
    >
      {isMusicMuted ? (
        <VolumeX className="w-6 h-6 text-white" />
      ) : (
        <Volume2 className="w-6 h-6 text-white" />
      )}
    </button>
  );
}
