import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Download,
  Music2,
  Loader2,
  ChevronDown,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react';
import {
  getPlaylistDetail,
  getPlaylistTrack,
  getTopPlaylist,
} from '@/services/apiWithFallback';
import type {
  Playlist,
  Song,
} from '@/services/api';
import {
  playlist as playlistDB,
  playlistSong,
  type PlaylistRecord,
  type PlaylistSongRecord,
} from '@/services/db';
import { usePlayerStore } from '@/store/playerStore';
import { exportToJSON, exportToCSV } from '@/utils/exportPlaylist';
import { formatDuration } from '@/utils/formatTime';
import { showToast } from '@/utils/notification';
import { cn } from '@/lib/utils';

interface SongRowProps {
  song: Song | PlaylistSongRecord;
  index: number;
  isActive: boolean;
  onPlay: () => void;
}

function SongRow({ song, index, isActive, onPlay }: SongRowProps) {
  const isSongType = 'artists' in song;

  const songName = isSongType ? song.name : song.songName;
  const artistName = isSongType
    ? song.artists.map((a) => a.name).join(' / ')
    : song.artistName;
  const albumName = isSongType ? song.album.name : song.albumName;
  const albumPic = isSongType ? song.album.picUrl : song.albumPic;
  const duration = isSongType ? song.duration : song.duration;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onPlay}
      className={cn(
        'song-item group',
        isActive && 'active'
      )}
    >
      <span
        className={cn(
          'w-8 text-center text-sm font-mono',
          isActive ? 'text-accent-cyan' : 'text-text-muted'
        )}
      >
        {index + 1}
      </span>

      <img
        src={albumPic}
        alt={songName}
        className="w-12 h-12 rounded-lg object-cover"
      />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            isActive ? 'text-accent-cyan' : 'text-text-primary'
          )}
        >
          {songName}
        </p>
        <p className="text-xs text-text-secondary truncate">
          {artistName} · {albumName}
        </p>
      </div>

      <span className="text-sm text-text-muted font-mono hidden sm:block">
        {formatDuration(duration)}
      </span>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Play className="w-4 h-4 text-accent-purple" />
      </div>
    </motion.div>
  );
}

function SongSkeleton() {
  return (
    <div className="song-item animate-pulse">
      <div className="w-8 h-4 bg-bg-tertiary rounded" />
      <div className="w-12 h-12 bg-bg-tertiary rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-bg-tertiary rounded" />
        <div className="h-3 w-1/2 bg-bg-tertiary rounded" />
      </div>
      <div className="w-12 h-4 bg-bg-tertiary rounded hidden sm:block" />
    </div>
  );
}

export default function PlaylistDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentSong, setCurrentSong, addListToQueue } = usePlayerStore();

  const [loading, setLoading] = useState(true);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [playlistInfo, setPlaylistInfo] = useState<Playlist | PlaylistRecord | null>(null);
  const [songs, setSongs] = useState<Song[] | PlaylistSongRecord[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isLocalPlaylist, setIsLocalPlaylist] = useState(false);

  useEffect(() => {
    if (id) {
      loadPlaylist();
    }
  }, [id]);

  const loadPlaylist = async () => {
    if (!id) return;

    setLoading(true);
    setLoadingSongs(true);

    const isLocal = id.startsWith('local_');
    setIsLocalPlaylist(isLocal);

    try {
      if (isLocal) {
        const [info, songRecords] = await Promise.all([
          playlistDB.getById(id),
          playlistSong.getByPlaylistId(id),
        ]);

        if (info) {
          setPlaylistInfo(info);
        }
        setSongs(songRecords);
      } else {
        const playlistId = parseInt(id, 10);
        const [info, tracks] = await Promise.all([
          getPlaylistDetail(playlistId),
          getPlaylistTrack(playlistId, 1000, 0),
        ]);

        if (info) {
          setPlaylistInfo(info);
        }
        setSongs(tracks.songs);
      }
    } catch (error) {
      console.error('Failed to load playlist:', error);
      showToast({ message: '加载歌单失败，请重试', type: 'error' });
    } finally {
      setLoading(false);
      setLoadingSongs(false);
    }
  };

  const handlePlayAll = () => {
    if (songs.length === 0) return;

    if ('artists' in songs[0]) {
      addListToQueue(songs as Song[]);
      setCurrentSong(songs[0] as Song, true);
    } else {
      const convertedSongs: Song[] = (songs as PlaylistSongRecord[]).map((s) => ({
        id: s.songId,
        name: s.songName,
        artists: [{ id: 0, name: s.artistName }],
        album: {
          id: 0,
          name: s.albumName,
          picUrl: s.albumPic,
        },
        duration: s.duration,
      }));
      addListToQueue(convertedSongs);
      setCurrentSong(convertedSongs[0], true);
    }

    showToast({ message: `已添加 ${songs.length} 首歌曲到播放队列`, type: 'success' });
  };

  const handlePlaySong = (song: Song | PlaylistSongRecord) => {
    if ('artists' in song) {
      setCurrentSong(song, true);
    } else {
      const convertedSong: Song = {
        id: song.songId,
        name: song.songName,
        artists: [{ id: 0, name: song.artistName }],
        album: {
          id: 0,
          name: song.albumName,
          picUrl: song.albumPic,
        },
        duration: song.duration,
      };
      setCurrentSong(convertedSong, true);
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    if (songs.length === 0 || !playlistInfo) return;

    const name = 'name' in playlistInfo ? playlistInfo.name : '';
    const exportSongs: PlaylistSongRecord[] =
      'artists' in songs[0]
        ? (songs as Song[]).map((s, i) => ({
            id: i + 1,
            playlistId: id || '',
            songId: s.id,
            songName: s.name,
            artistName: s.artists.map((a) => a.name).join(' / '),
            albumName: s.album.name,
            albumPic: s.album.picUrl,
            duration: s.duration,
          }))
        : (songs as PlaylistSongRecord[]);

    if (format === 'json') {
      exportToJSON(exportSongs, name);
      showToast({ message: 'JSON 导出成功', type: 'success' });
    } else {
      exportToCSV(exportSongs, name);
      showToast({ message: 'CSV 导出成功', type: 'success' });
    }

    setShowExportMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
          <p className="text-text-secondary">加载中...</p>
        </div>
      </div>
    );
  }

  if (!playlistInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
          <Music2 className="w-10 h-10 text-text-muted" />
        </div>
        <p className="text-text-secondary text-lg mb-2">歌单不存在</p>
        <p className="text-text-muted text-sm mb-6">该歌单可能已被删除</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-gradient-accent text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          返回
        </button>
      </div>
    );
  }

  const isPlaylistType = 'coverImgUrl' in playlistInfo;
  const coverUrl = isPlaylistType
    ? playlistInfo.coverImgUrl
    : playlistInfo.coverUrl || `https://picsum.photos/seed/${playlistInfo.id}/300/300`;
  const name = playlistInfo.name;
  const description = isPlaylistType ? playlistInfo.description : undefined;
  const trackCount = isPlaylistType
    ? playlistInfo.trackCount
    : songs.length;
  const playCount = isPlaylistType ? playlistInfo.playCount : undefined;

  const isCurrentSongInPlaylist = (song: Song | PlaylistSongRecord) => {
    if (!currentSong) return false;
    const songId = 'artists' in song ? song.id : song.songId;
    return currentSong.id === songId;
  };

  return (
    <div className="min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-110"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-primary/80 to-bg-primary" />

        <div className="relative p-4 sm:p-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 text-text-secondary hover:text-text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-end">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl shadow-accent-purple/20"
            >
              <img
                src={coverUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            </motion.div>

            <div className="text-center sm:text-left flex-1">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-text-muted uppercase tracking-wider mb-2"
              >
                {isLocalPlaylist ? '本地歌单' : '网易云歌单'}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl sm:text-4xl font-bold text-text-primary mb-3"
              >
                {name}
              </motion.h1>

              {description && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-text-secondary mb-4 line-clamp-2 max-w-2xl"
                >
                  {description}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-4 text-sm text-text-muted"
              >
                <span>{trackCount} 首歌曲</span>
                {playCount !== undefined && <span>播放 {playCount.toLocaleString()}</span>}
                {!isPlaylistType && 'createdAt' in playlistInfo && (
                  <span>
                    创建于 {new Date(playlistInfo.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                )}
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-4 mt-8"
          >
            <button
              onClick={handlePlayAll}
              disabled={songs.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity btn-glow disabled:opacity-50"
            >
              <Play className="w-5 h-5" />
              播放全部
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={songs.length === 0}
                className="flex items-center gap-2 px-6 py-3 border border-border-subtle text-text-secondary hover:bg-white/5 hover:text-text-primary rounded-full font-medium transition-colors disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                导出
                <ChevronDown className={cn('w-4 h-4 transition-transform', showExportMenu && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute left-0 top-full mt-2 w-48 bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <button
                        onClick={() => handleExport('json')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
                      >
                        <FileJson className="w-4 h-4 text-accent-purple" />
                        导出为 JSON
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors border-t border-border-subtle"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-accent-cyan" />
                        导出为 CSV
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 pb-8">
        <div className="mt-4 mb-2 px-4 py-2 grid grid-cols-12 gap-3 text-xs text-text-muted uppercase tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-11 sm:col-span-7">歌曲</div>
          <div className="col-span-3 text-right hidden sm:block">时长</div>
        </div>

        <div className="space-y-1">
          {loadingSongs ? (
            [...Array(10)].map((_, i) => <SongSkeleton key={i} />)
          ) : songs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
                <Music2 className="w-8 h-8 text-text-muted" />
              </div>
              <p className="text-text-secondary mb-1">歌单中还没有歌曲</p>
              <p className="text-text-muted text-sm">去搜索添加一些歌曲吧</p>
            </motion.div>
          ) : (
            songs.map((song, index) => (
              <SongRow
                key={('id' in song ? song.id : song.songId) + '-' + index}
                song={song}
                index={index}
                isActive={isCurrentSongInPlaylist(song)}
                onPlay={() => handlePlaySong(song)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
