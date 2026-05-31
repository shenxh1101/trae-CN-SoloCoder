import { useEffect } from 'react';
import { Camera, Download, Video, Music, Square } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';

interface ToolBarProps {
  onScreenshot: () => void;
  onExportOBJ: () => void;
  onStartRecording: (onComplete?: () => void) => void;
  onStopRecording: () => Promise<void>;
}

export function ToolBar({
  onScreenshot,
  onExportOBJ,
  onStartRecording,
  onStopRecording,
}: ToolBarProps) {
  const {
    recordState,
    audioEnabled,
    audioAmplitude,
    setAudioEnabled,
    setAudioAmplitude,
  } = useStore();

  const { start: startAudio, stop: stopAudio } = useAudioVisualizer(setAudioAmplitude);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const handleAudioToggle = async () => {
    if (audioEnabled) {
      stopAudio();
      setAudioEnabled(false);
    } else {
      try {
        await startAudio();
        setAudioEnabled(true);
      } catch (error) {
        console.error('Failed to start audio:', error);
        alert('无法访问麦克风，请确保已授予麦克风权限。');
        setAudioEnabled(false);
        setAudioAmplitude(0);
      }
    }
  };

  const handleRecording = async () => {
    if (recordState.isRecording) {
      await onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <div className="absolute left-4 top-4 flex flex-col gap-3">
      <button
        onClick={onScreenshot}
        className="group w-12 h-12 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all"
        title="截图保存"
      >
        <Camera className="w-5 h-5 text-white group-hover:text-cyan-400 transition-colors" />
      </button>

      <button
        onClick={onExportOBJ}
        className="group w-12 h-12 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center hover:bg-pink-500/20 hover:border-pink-500/50 transition-all"
        title="导出OBJ模型"
      >
        <Download className="w-5 h-5 text-white group-hover:text-pink-400 transition-colors" />
      </button>

      <button
        onClick={handleRecording}
        className={`group w-12 h-12 backdrop-blur-xl rounded-xl border flex items-center justify-center transition-all relative ${
          recordState.isRecording
            ? 'bg-red-500/30 border-red-500/50'
            : 'bg-black/60 border-white/10 hover:bg-purple-500/20 hover:border-purple-500/50'
        }`}
        title={recordState.isRecording ? '停止录制' : '录制10秒动画'}
      >
        {recordState.isRecording ? (
          <Square className="w-5 h-5 text-red-400" fill="currentColor" />
        ) : (
          <Video className="w-5 h-5 text-white group-hover:text-purple-400 transition-colors" />
        )}
        {recordState.isRecording && (
          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${recordState.progress}%` }}
            />
          </div>
        )}
      </button>

      <button
        onClick={handleAudioToggle}
        className={`group w-12 h-12 backdrop-blur-xl rounded-xl border flex items-center justify-center transition-all relative ${
          audioEnabled
            ? 'bg-green-500/30 border-green-500/50'
            : 'bg-black/60 border-white/10 hover:bg-green-500/20 hover:border-green-500/50'
        }`}
        title={audioEnabled ? '关闭音频可视化' : '开启音频可视化'}
      >
        <Music
          className={`w-5 h-5 transition-colors ${
            audioEnabled ? 'text-green-400' : 'text-white group-hover:text-green-400'
          }`}
        />
        {audioEnabled && (
          <div className="absolute -bottom-2 left-0 right-0 h-3 flex items-end justify-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-green-400 rounded-full transition-all"
                style={{
                  height: `${Math.max(2, audioAmplitude * 12 * (1 + i * 0.3))}px`,
                }}
              />
            ))}
          </div>
        )}
      </button>
    </div>
  );
}
