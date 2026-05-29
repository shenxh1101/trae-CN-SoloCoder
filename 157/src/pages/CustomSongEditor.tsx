import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Save, Trash2, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Direction, Note, Song } from '../types/game';
import { DIRECTIONS } from '../config/gameConfig';
import { saveCustomSong } from '../utils/storage';
import { fileToBase64, formatTime } from '../utils/audio';

const directionColors: Record<Direction, string> = {
  left: 'bg-cyan-500',
  down: 'bg-green-500',
  up: 'bg-amber-500',
  right: 'bg-pink-500',
};

const directionTextColors: Record<Direction, string> = {
  left: 'text-cyan-400',
  down: 'text-green-400',
  up: 'text-amber-400',
  right: 'text-pink-400',
};

const directionArrows: Record<Direction, string> = {
  left: '←',
  down: '↓',
  up: '↑',
  right: '→',
};

const TRACK_HEIGHT = 80;

export function CustomSongEditor() {
  const navigate = useNavigate();
  const [songName, setSongName] = useState('');
  const [bpm, setBpm] = useState(120);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setSongName(file.name.replace(/\.[^/.]+$/, ''));
      
      try {
        const base64 = await fileToBase64(file);
        setAudioBase64(base64);
      } catch (error) {
        console.error('音频文件转换失败:', error);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration * 1000);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime * 1000);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getTimeFromPosition = useCallback((clientX: number, direction: Direction): number => {
    const trackEl = trackRefs.current.get(direction);
    if (!trackEl || duration === 0) return 0;
    
    const rect = trackEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    return percentage * duration;
  }, [duration]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>, direction: Direction) => {
    const time = getTimeFromPosition(e.clientX, direction);
    
    const newNote: Note = {
      id: Math.random().toString(36).substring(2, 11),
      direction,
      time,
    };
    
    setNotes([...notes, newNote].sort((a, b) => a.time - b.time));
  };

  const handleAddNoteAtCurrentTime = (direction: Direction) => {
    const newNote: Note = {
      id: Math.random().toString(36).substring(2, 11),
      direction,
      time: currentTime,
    };
    setNotes([...notes, newNote].sort((a, b) => a.time - b.time));
  };

  const removeNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(notes.filter(n => n.id !== noteId));
  };

  const handleSave = () => {
    if (!songName || !audioBase64 || notes.length === 0) {
      alert('请填写歌曲名称、上传音频文件并添加至少一个音符');
      return;
    }

    const song: Song = {
      id: `custom-${Date.now()}`,
      name: songName,
      bpm: bpm,
      duration: duration,
      notes: notes,
      audioUrl: audioBase64,
      isCustom: true,
    };

    try {
      saveCustomSong(song);
      navigate('/');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('保存失败：音频文件太大，超出浏览器存储限制。请尝试使用更小的音频文件。');
      } else {
        alert('保存失败，请重试。');
      }
    }
  };

  const getNotePosition = (time: number): number => {
    if (duration === 0) return 0;
    return (time / duration) * 100;
  };

  const renderTimeMarkers = () => {
    if (duration === 0) return null;
    
    const markers = [];
    const interval = 5000;
    for (let t = 0; t <= duration; t += interval) {
      const position = (t / duration) * 100;
      markers.push(
        <div
          key={t}
          className="absolute top-0 bottom-0 w-px bg-gray-700/50 z-0"
          style={{ left: `${position}%` }}
        >
          <span className="absolute -top-5 text-xs text-gray-500 transform -translate-x-1/2 whitespace-nowrap">
            {formatTime(t)}
          </span>
        </div>
      );
    }
    return markers;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">创建自定义歌曲</h1>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-bold text-white mb-4">基本信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">歌曲名称</label>
                <input
                  type="text"
                  value={songName}
                  onChange={(e) => setSongName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="输入歌曲名称"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">BPM</label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  min="60"
                  max="240"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-2">音频文件</label>
              <label className="flex items-center justify-center gap-2 w-full px-4 py-4 bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 cursor-pointer hover:border-cyan-500 hover:text-cyan-400 transition-colors">
                <Music className="w-5 h-5" />
                {audioFile ? audioFile.name : '点击上传音频文件 (MP3, WAV)'}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {audioUrl && (
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold text-white mb-4">节奏编辑器</h2>
              
              <audio
                ref={audioRef}
                src={audioUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={togglePlay}
                  className="p-3 bg-cyan-500 hover:bg-cyan-400 rounded-full transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="text-sm text-gray-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  已添加 {notes.length} 个音符
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">快速添加音符 (在当前播放位置):</label>
                <div className="flex gap-2">
                  {DIRECTIONS.map((direction) => (
                    <button
                      key={direction}
                      onClick={() => handleAddNoteAtCurrentTime(direction)}
                      className={`px-4 py-2 ${directionColors[direction]} text-white rounded-lg font-medium hover:opacity-80 transition-opacity flex items-center gap-1`}
                    >
                      <span className="text-lg">{directionArrows[direction]}</span>
                      <span>{direction}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4 p-4 bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">
                  💡 操作提示：点击下方轨道的任意位置，在对应时间点添加该方向的音符
                </p>
                <p className="text-sm text-gray-500">
                  点击已添加的音符可以删除
                </p>
              </div>

              <div
                className="relative bg-gray-900 rounded-lg"
                style={{
                  paddingTop: '30px',
                  paddingBottom: '10px',
                }}
              >
                {DIRECTIONS.map((direction) => (
                  <div
                    key={direction}
                    ref={(el) => {
                      if (el) {
                        trackRefs.current.set(direction, el);
                      }
                    }}
                    onClick={(e) => handleTrackClick(e, direction)}
                    className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-all hover:bg-gray-800/50 my-1 mx-14 border-gray-700 hover:border-gray-600`}
                    style={{
                      height: `${TRACK_HEIGHT}px`,
                    }}
                  >
                    {renderTimeMarkers()}

                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-20 pointer-events-none"
                      style={{
                        left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                        boxShadow: '0 0 10px rgba(6, 182, 212, 0.8)',
                      }}
                    />

                    <div
                      className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full -ml-2 w-10 h-10 rounded-lg flex items-center justify-center ${directionColors[direction]}`}
                    >
                      <span className="text-xl text-white font-bold">
                        {directionArrows[direction]}
                      </span>
                    </div>

                    <div className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-2 text-sm ${directionTextColors[direction]} font-medium whitespace-nowrap`}>
                      {direction}
                    </div>

                    {notes
                      .filter((note) => note.direction === direction)
                      .map((note) => {
                        const position = getNotePosition(note.time);
                        return (
                          <div
                            key={note.id}
                            onClick={(e) => removeNote(note.id, e)}
                            className={`absolute top-1/2 w-10 h-10 ${directionColors[direction]} rounded-lg cursor-pointer hover:scale-110 transition-transform flex items-center justify-center group shadow-lg`}
                            style={{
                              left: `${position}%`,
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                            }}
                            title={`时间: ${formatTime(note.time)} - 点击删除`}
                          >
                            <span className="text-lg text-white font-bold">
                              {directionArrows[direction]}
                            </span>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg flex items-center justify-center transition-colors">
                              <Trash2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  音符总数: {notes.length}
                </div>
                {notes.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('确定要清空所有音符吗？')) {
                        setNotes([]);
                      }
                    }}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    清空所有音符
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!audioBase64 || notes.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              保存歌曲
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
