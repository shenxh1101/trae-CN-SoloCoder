import axios, { type AxiosInstance } from 'axios';
import { useApiStatusStore, API_ENDPOINTS } from '../store/apiStatusStore';
import * as mock from './mockData';
import type {
  Song, SearchResult, Playlist, LyricLine, Comment, CommentResponse,
  User, LoginResponse, RadioProgram, RecommendSong, SearchParams
} from './api';
import { parseLyric } from './api';

let currentEndpointIndex = 0;

const getNextEndpoint = () => {
  currentEndpointIndex = (currentEndpointIndex + 1) % API_ENDPOINTS.length;
  return API_ENDPOINTS[currentEndpointIndex];
};

const createRequest = (baseURL: string) => {
  return axios.create({
    baseURL,
    withCredentials: true,
    timeout: 10000,
  });
};

const tryRequest = async <T>(
  requestFn: (request: AxiosInstance) => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  const { useMockFallback } = useApiStatusStore.getState();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const endpoint = attempt === 0
      ? useApiStatusStore.getState().currentEndpoint
      : getNextEndpoint();

    try {
      const request = createRequest(endpoint);
      const result = await requestFn(request);

      useApiStatusStore.getState().setStatus('online');
      useApiStatusStore.getState().setProvider('netease');
      useApiStatusStore.getState().setCurrentEndpoint(endpoint);
      useApiStatusStore.getState().setError(null);

      return result;
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${attempt + 1} failed for ${endpoint}:`, error);
      continue;
    }
  }

  if (useMockFallback) {
    console.log('All API attempts failed, falling back to mock data');
    useApiStatusStore.getState().setStatus('fallback');
    useApiStatusStore.getState().setProvider('mock');
    useApiStatusStore.getState().setError('网易云API不可用，已切换到本地演示数据');
    throw new Error('API_FALLBACK');
  }

  useApiStatusStore.getState().setStatus('offline');
  useApiStatusStore.getState().setError(lastError?.message || '网络请求失败');
  throw lastError;
};

export const search = async (params: SearchParams): Promise<SearchResult> => {
  try {
    return await tryRequest(async (request) => {
      const { keywords, type = 1, limit = 30, offset = 0 } = params;
      const data = await request.get('/search', {
        params: { keywords, type, limit, offset, timestamp: Date.now() },
      });
      if (data.data.code !== 200) {
        throw new Error(data.data.message || '搜索失败');
      }
      return {
        songs: data.data.result.songs || [],
        hasMore: data.data.result.hasMore || false,
        songCount: data.data.result.songCount || 0,
      };
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      const results = mock.searchMockSongs(params.keywords);
      return {
        songs: results,
        hasMore: false,
        songCount: results.length,
      };
    }
    throw error;
  }
};

export const getSongUrl = async (id: number): Promise<string | null> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/song/url/v1', {
        params: { id, level: 'standard', timestamp: Date.now() },
      });
      if (data.data.code !== 200 || !data.data.data?.[0]?.url) {
        throw new Error('无法获取播放地址');
      }
      return data.data.data[0].url;
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      return mock.getMockSongUrl(id);
    }
    throw error;
  }
};

export const getSongDetail = async (ids: number[]): Promise<Song[]> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/song/detail', {
        params: { ids: ids.join(','), timestamp: Date.now() },
      });
      if (data.data.code !== 200) {
        throw new Error(data.data.message || '获取歌曲详情失败');
      }
      return data.data.songs || [];
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      return mock.mockSongs.filter(s => ids.includes(s.id));
    }
    throw error;
  }
};

export const getLyric = async (id: number): Promise<LyricLine[]> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/lyric', {
        params: { id, timestamp: Date.now() },
      });
      if (data.data.code !== 200) {
        throw new Error('获取歌词失败');
      }
      const lrcStr = data.data.lrc?.lyric || '';
      return parseLyric(lrcStr);
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      return mock.getMockLyric(id);
    }
    throw error;
  }
};

export const getHotComments = async (
  id: number,
  limit: number = 20,
  offset: number = 0
): Promise<CommentResponse> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/comment/hot', {
        params: { id, type: 0, limit, offset, timestamp: Date.now() },
      });
      if (data.data.code !== 200) {
        return { hotComments: [], total: 0, hasMore: false };
      }
      return {
        hotComments: data.data.hotComments || [],
        total: data.data.total || 0,
        hasMore: data.data.hasMore || false,
      };
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      const comments = mock.generateMockComments(id, limit);
      return {
        hotComments: comments,
        total: 50,
        hasMore: offset + limit < 50,
      };
    }
    throw error;
  }
};

export const login = async (
  phone: string,
  password: string
): Promise<LoginResponse> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/login/cellphone', {
        params: { phone, password, timestamp: Date.now() },
      });
      return data.data;
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      if (phone && password) {
        return {
          code: 200,
          profile: mock.mockUser,
          cookie: 'mock_cookie',
          token: 'mock_token',
        };
      }
      return {
        code: 502,
        message: 'API不可用，演示模式：输入任意手机号密码即可登录',
      };
    }
    throw error;
  }
};

export const loginStatus = async (): Promise<{ data: User | null; code: number }> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/login/status', {
        params: { timestamp: Date.now() },
      });
      return {
        code: data.data.code,
        data: data.data.data?.profile || null,
      };
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      return { code: 200, data: null };
    }
    throw error;
  }
};

export const logout = async (): Promise<{ code: number }> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/logout');
      return data.data;
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      return { code: 200 };
    }
    throw error;
  }
};

export const getUserPlaylist = async (uid: number): Promise<Playlist[]> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/user/playlist', {
        params: { uid, timestamp: Date.now() },
      });
      if (data.data.code !== 200) {
        return [];
      }
      return data.data.playlist || [];
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      return mock.mockPlaylists;
    }
    throw error;
  }
};

export const getRecommendSongs = async (): Promise<RecommendSong[]> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/recommend/songs', {
        params: { timestamp: Date.now() },
      });
      if (data.data.code !== 200) {
        return [];
      }
      return data.data.data?.dailySongs || [];
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      return mock.mockRecommendSongs;
    }
    throw error;
  }
};

export const getSimilarRadio = async (id: number): Promise<RadioProgram[]> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/dj/similar', {
        params: { id, timestamp: Date.now() },
      });
      if (data.data.code !== 200) {
        return [];
      }
      return data.data.programs || [];
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      return mock.mockRadioPrograms;
    }
    throw error;
  }
};

export const getPlaylistDetail = async (id: number): Promise<Playlist | null> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/playlist/detail', {
        params: { id, timestamp: Date.now() },
      });
      if (data.data.code !== 200) {
        return null;
      }
      return data.data.playlist || null;
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      return mock.mockPlaylists.find(p => p.id === id) || null;
    }
    throw error;
  }
};

export const getPlaylistTrack = async (
  id: number,
  limit: number = 100,
  offset: number = 0
): Promise<{ songs: Song[]; total: number }> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/playlist/track/all', {
        params: { id, limit, offset, timestamp: Date.now() },
      });
      if (data.data.code !== 200) {
        return { songs: [], total: 0 };
      }
      return {
        songs: data.data.songs || [],
        total: data.data.songs?.length || 0,
      };
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      const songs = mock.mockSongs.slice(offset, offset + limit);
      return { songs, total: mock.mockSongs.length };
    }
    throw error;
  }
};

export const getTopPlaylist = async (
  limit: number = 10,
  offset: number = 0
): Promise<Playlist[]> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/top/playlist', {
        params: { limit, offset, timestamp: Date.now() },
      });
      if (data.data.code !== 200) {
        return [];
      }
      return data.data.playlists || [];
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      return mock.mockPlaylists;
    }
    throw error;
  }
};

export const getBanner = async (): Promise<Array<{ imageUrl: string; targetId: number }>> => {
  try {
    return await tryRequest(async (request) => {
      const data = await request.get('/banner', {
        params: { type: 0, timestamp: Date.now() },
      });
      if (data.data.code !== 200) {
        return [];
      }
      return data.data.banners || [];
    });
  } catch (error) {
    if ((error as Error).message === 'API_FALLBACK') {
      return [
        { imageUrl: 'https://p2.music.126.net/DrZ1w==/109951165051626349.jpg', targetId: 4001 },
        { imageUrl: 'https://p2.music.126.net/Hhk6w==/109951166051626349.jpg', targetId: 4002 },
        { imageUrl: 'https://p2.music.126.net/DrZ1w==/109951167051626349.jpg', targetId: 4003 },
      ];
    }
    throw error;
  }
};

export default {
  search,
  getSongUrl,
  getSongDetail,
  getLyric,
  getHotComments,
  login,
  loginStatus,
  logout,
  getUserPlaylist,
  getRecommendSongs,
  getSimilarRadio,
  getPlaylistDetail,
  getPlaylistTrack,
  getTopPlaylist,
  getBanner,
};
