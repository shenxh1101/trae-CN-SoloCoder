import axios from 'axios';

export interface Artist {
  id: number;
  name: string;
  picUrl?: string;
  alias?: string[];
}

export interface Album {
  id: number;
  name: string;
  picUrl: string;
  pic?: number;
  publishTime?: number;
  artist?: Artist;
}

export interface Song {
  id: number;
  name: string;
  artists: Artist[];
  album: Album;
  duration: number;
  url?: string;
  fee?: number;
  privilege?: {
    fee: number;
    payed: number;
    st: number;
    pl: number;
    dl: number;
    sp: number;
    cp: number;
    subp: number;
    cs: boolean;
    maxbr: number;
    fl: number;
    toast: boolean;
    flag: number;
  };
}

export interface SearchResult {
  songs: Song[];
  hasMore: boolean;
  songCount: number;
}

export interface Playlist {
  id: number;
  name: string;
  coverImgUrl: string;
  description?: string;
  trackCount: number;
  playCount: number;
  subscribed?: boolean;
  creator?: {
    userId: number;
    nickname: string;
    avatarUrl: string;
  };
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface Comment {
  commentId: number;
  content: string;
  user: {
    nickname: string;
    avatarUrl: string;
    userId: number;
  };
  likedCount: number;
  time: number;
  liked?: boolean;
}

export interface CommentResponse {
  hotComments: Comment[];
  total: number;
  hasMore: boolean;
}

export interface User {
  userId: number;
  nickname: string;
  avatarUrl: string;
  signature?: string;
  level?: number;
  listenSongs?: number;
}

export interface LoginResponse {
  code: number;
  message?: string;
  profile?: User;
  cookie?: string;
  token?: string;
}

export interface RadioProgram {
  id: number;
  name: string;
  coverUrl: string;
  description?: string;
  playCount: number;
  radio: {
    id: number;
    name: string;
    picUrl: string;
  };
}

export interface RecommendSong {
  id: number;
  name: string;
  artists: Artist[];
  album: Album;
  duration: number;
  reason?: string;
}

const request = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
});

request.interceptors.request.use(
  (config) => {
    const timestamp = Date.now();
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        timestamp,
      };
    } else {
      config.data = {
        ...config.data,
        timestamp,
      };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

request.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

interface BaseApiResponse {
  code: number;
  message?: string;
}

interface SearchApiResponse extends BaseApiResponse {
  result: {
    songs?: Song[];
    hasMore?: boolean;
    songCount?: number;
  };
}

interface SongUrlApiResponse extends BaseApiResponse {
  data?: Array<{ url?: string }>;
}

interface SongDetailApiResponse extends BaseApiResponse {
  songs?: Song[];
}

interface LyricApiResponse extends BaseApiResponse {
  lrc?: { lyric?: string };
}

interface CommentApiResponse extends BaseApiResponse {
  hotComments?: Comment[];
  total?: number;
  hasMore?: boolean;
}

interface LoginStatusApiResponse extends BaseApiResponse {
  data?: { profile?: User };
}

interface UserPlaylistApiResponse extends BaseApiResponse {
  playlist?: Playlist[];
}

interface RecommendSongsApiResponse extends BaseApiResponse {
  data?: { dailySongs?: RecommendSong[] };
}

interface SimilarRadioApiResponse extends BaseApiResponse {
  programs?: RadioProgram[];
}

interface PlaylistDetailApiResponse extends BaseApiResponse {
  playlist?: Playlist;
}

interface PlaylistTrackApiResponse extends BaseApiResponse {
  songs?: Song[];
}

interface TopPlaylistApiResponse extends BaseApiResponse {
  playlists?: Playlist[];
}

interface BannerApiResponse extends BaseApiResponse {
  banners?: Array<{ imageUrl: string; targetId: number }>;
}

export interface SearchParams {
  keywords: string;
  type?: 1 | 10 | 100 | 1000 | 1002 | 1004 | 1006 | 1009;
  limit?: number;
  offset?: number;
}

export const search = async (params: SearchParams): Promise<SearchResult> => {
  const { keywords, type = 1, limit = 30, offset = 0 } = params;
  const data = (await request.get('/search', {
    params: { keywords, type, limit, offset },
  })) as SearchApiResponse;
  if (data.code !== 200) {
    throw new Error(data.message || '搜索失败');
  }
  return {
    songs: data.result.songs || [],
    hasMore: data.result.hasMore || false,
    songCount: data.result.songCount || 0,
  };
};

export const getSongUrl = async (id: number): Promise<string | null> => {
  const data = (await request.get('/song/url/v1', {
    params: { id, level: 'standard' },
  })) as SongUrlApiResponse;
  if (data.code !== 200 || !data.data?.[0]?.url) {
    return null;
  }
  return data.data[0].url;
};

export const getSongDetail = async (ids: number[]): Promise<Song[]> => {
  const data = (await request.get('/song/detail', {
    params: { ids: ids.join(',') },
  })) as SongDetailApiResponse;
  if (data.code !== 200) {
    throw new Error(data.message || '获取歌曲详情失败');
  }
  return data.songs || [];
};

export const getLyric = async (id: number): Promise<LyricLine[]> => {
  const data = (await request.get('/lyric', { params: { id } })) as LyricApiResponse;
  if (data.code !== 200) {
    return [];
  }
  const lrcStr = data.lrc?.lyric || '';
  return parseLyric(lrcStr);
};

export const parseLyric = (lyricStr: string): LyricLine[] => {
  if (!lyricStr) return [];
  const lines = lyricStr.split('\n');
  const result: LyricLine[] = [];
  const timeReg = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeReg)];
    if (matches.length === 0) continue;

    let text = line.replace(timeReg, '').trim();
    if (!text) text = '...';

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const time = minutes * 60 * 1000 + seconds * 1000 + milliseconds;
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
};

export const getHotComments = async (
  id: number,
  limit: number = 20,
  offset: number = 0
): Promise<CommentResponse> => {
  const data = (await request.get('/comment/hot', {
    params: { id, type: 0, limit, offset },
  })) as CommentApiResponse;
  if (data.code !== 200) {
    return { hotComments: [], total: 0, hasMore: false };
  }
  return {
    hotComments: data.hotComments || [],
    total: data.total || 0,
    hasMore: data.hasMore || false,
  };
};

export const login = async (
  phone: string,
  password: string
): Promise<LoginResponse> => {
  const data = (await request.get('/login/cellphone', {
    params: { phone, password },
  })) as LoginResponse;
  return data;
};

export const loginStatus = async (): Promise<{ data: User | null; code: number }> => {
  const data = (await request.get('/login/status')) as LoginStatusApiResponse;
  return {
    code: data.code,
    data: data.data?.profile || null,
  };
};

export const logout = async (): Promise<{ code: number }> => {
  return (await request.get('/logout')) as { code: number };
};

export const getUserPlaylist = async (uid: number): Promise<Playlist[]> => {
  const data = (await request.get('/user/playlist', { params: { uid } })) as UserPlaylistApiResponse;
  if (data.code !== 200) {
    return [];
  }
  return data.playlist || [];
};

export const getRecommendSongs = async (): Promise<RecommendSong[]> => {
  const data = (await request.get('/recommend/songs')) as RecommendSongsApiResponse;
  if (data.code !== 200) {
    return [];
  }
  return data.data?.dailySongs || [];
};

export const getSimilarRadio = async (id: number): Promise<RadioProgram[]> => {
  try {
    const data = (await request.get('/dj/similar', { params: { id } })) as SimilarRadioApiResponse;
    if (data.code !== 200) {
      return [];
    }
    return data.programs || [];
  } catch {
    return [];
  }
};

export const getPlaylistDetail = async (id: number): Promise<Playlist | null> => {
  const data = (await request.get('/playlist/detail', { params: { id } })) as PlaylistDetailApiResponse;
  if (data.code !== 200) {
    return null;
  }
  return data.playlist || null;
};

export const getPlaylistTrack = async (
  id: number,
  limit: number = 100,
  offset: number = 0
): Promise<{ songs: Song[]; total: number }> => {
  const data = (await request.get('/playlist/track/all', {
    params: { id, limit, offset },
  })) as PlaylistTrackApiResponse;
  if (data.code !== 200) {
    return { songs: [], total: 0 };
  }
  return {
    songs: data.songs || [],
    total: data.songs?.length || 0,
  };
};

export const getTopPlaylist = async (
  limit: number = 10,
  offset: number = 0
): Promise<Playlist[]> => {
  const data = (await request.get('/top/playlist', {
    params: { limit, offset },
  })) as TopPlaylistApiResponse;
  if (data.code !== 200) {
    return [];
  }
  return data.playlists || [];
};

export const getBanner = async (): Promise<Array<{ imageUrl: string; targetId: number }>> => {
  const data = (await request.get('/banner', { params: { type: 0 } })) as BannerApiResponse;
  if (data.code !== 200) {
    return [];
  }
  return data.banners || [];
};

export default request;
