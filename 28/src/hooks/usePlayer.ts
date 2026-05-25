import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl } from 'howler';
import { usePlayerStore } from '../store/playerStore';
import { getSongUrl, getLyric } from '../services/apiWithFallback';
import { findCurrentLyricIndex } from '../utils/lyricParser';
import { showSongNotification, requestNotificationPermission } from '../utils/notification';
import { recentPlay } from '../services/db';
import type { Song } from '../services/api';

export function usePlayer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Howl | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastSeekRef = useRef<number>(0);

  const {
    currentSong,
    isPlaying,
    volume,
    mute,
    lyrics,
    currentTime,
    setPlayState,
    nextSong,
    updateProgress,
    setLyrics,
    setCurrentLyricIndex,
    setAudioContext,
  } = usePlayerStore();

  const updateProgressLoop = useCallback(() => {
    if (soundRef.current && soundRef.current.playing()) {
      const current = soundRef.current.seek() as number;
      const duration = soundRef.current.duration();
      updateProgress(current * 1000, duration * 1000);

      const lyricIndex = findCurrentLyricIndex(lyrics, current * 1000);
      if (lyricIndex >= 0) {
        setCurrentLyricIndex(lyricIndex);
      }
    }
    animationFrameRef.current = requestAnimationFrame(updateProgressLoop);
  }, [updateProgress, lyrics, setCurrentLyricIndex]);

  const setupAudioContext = useCallback(() => {
    if (!audioContextRef.current || !analyserRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      setAudioContext(ctx, analyser);
    }

    if (soundRef.current && audioContextRef.current) {
      const howlWithSounds = soundRef.current as unknown as {
        _sounds: Array<{ _node: AudioNode }>;
      };
      if (howlWithSounds._sounds[0]?._node && analyserRef.current) {
        try {
          howlWithSounds._sounds[0]._node.connect(analyserRef.current);
        } catch {
          // Already connected
        }
      }
    }
  }, [setAudioContext]);

  const cleanupSound = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (soundRef.current) {
      soundRef.current.unload();
      soundRef.current = null;
    }
  };

  const loadSong = useCallback(async (song: Song) => {
    cleanupSound();
    setLoading(true);
    setError(null);

    try {
      const [url, lyricData] = await Promise.all([
        getSongUrl(song.id),
        getLyric(song.id),
      ]);

      if (!url) {
        setError('无法获取歌曲播放链接');
        setLoading(false);
        nextSong();
        return;
      }

      setLyrics(lyricData);

      const sound = new Howl({
        src: [url],
        html5: true,
        volume: mute ? 0 : volume,
        onplay: () => {
          setPlayState(true);
          requestNotificationPermission();
          showSongNotification(
            song.name,
            song.artists.map(a => a.name).join(' / '),
            song.album.picUrl
          );
          recentPlay.add({
            songId: song.id,
            songName: song.name,
            artistName: song.artists.map(a => a.name).join(' / '),
            albumPic: song.album.picUrl,
          });
          setupAudioContext();
          if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(updateProgressLoop);
          }
        },
        onpause: () => {
          setPlayState(false);
        },
        onend: () => {
          setPlayState(false);
          nextSong();
        },
        onload: () => {
          setLoading(false);
        },
        onloaderror: (_id, err) => {
          console.error('加载失败:', err);
          setError('歌曲加载失败');
          setLoading(false);
          nextSong();
        },
      });

      soundRef.current = sound;

      if (isPlaying) {
        sound.play();
      }
    } catch (err) {
      console.error('加载歌曲失败:', err);
      setError('加载歌曲失败');
      setLoading(false);
    }
  }, [mute, volume, isPlaying, setPlayState, nextSong, setLyrics, setupAudioContext, updateProgressLoop]);

  useEffect(() => {
    if (currentSong) {
      loadSong(currentSong);
    }

    return () => {
      cleanupSound();
    };
  }, [currentSong, loadSong]);

  useEffect(() => {
    if (soundRef.current) {
      if (isPlaying && !soundRef.current.playing()) {
        soundRef.current.play();
      } else if (!isPlaying && soundRef.current.playing()) {
        soundRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.volume(mute ? 0 : volume);
    }
  }, [volume, mute]);

  useEffect(() => {
    if (soundRef.current && Math.abs(currentTime - lastSeekRef.current) > 100) {
      soundRef.current.seek(currentTime / 1000);
      lastSeekRef.current = currentTime;
    }
  }, [currentTime]);

  useEffect(() => {
    return () => {
      cleanupSound();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { loading, error };
}
