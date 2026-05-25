import { create } from 'zustand';

export type ApiStatus = 'checking' | 'online' | 'fallback' | 'offline';
export type ApiProvider = 'netease' | 'mock';

interface ApiStatusState {
  status: ApiStatus;
  provider: ApiProvider;
  currentEndpoint: string;
  lastCheck: number | null;
  error: string | null;
  availableEndpoints: string[];
  useMockFallback: boolean;
  setStatus: (status: ApiStatus) => void;
  setProvider: (provider: ApiProvider) => void;
  setCurrentEndpoint: (endpoint: string) => void;
  setError: (error: string | null) => void;
  setUseMockFallback: (value: boolean) => void;
  checkApiHealth: () => Promise<boolean>;
  resetStatus: () => void;
}

const API_ENDPOINTS = [
  'https://netease-cloud-music-api-five-roan.vercel.app',
  'https://netease-cloud-music-api-psi-lac.vercel.app',
  'https://netease-cloud-music-api-beta-eight.vercel.app',
  'https://netease-music-api.fe-mm.com',
  'https://netease-cloud-music-api-lyart.vercel.app',
];

export const useApiStatusStore = create<ApiStatusState>((set, get) => ({
  status: 'checking',
  provider: 'netease',
  currentEndpoint: API_ENDPOINTS[0],
  lastCheck: null,
  error: null,
  availableEndpoints: API_ENDPOINTS,
  useMockFallback: true,

  setStatus: (status) => set({ status }),
  setProvider: (provider) => set({ provider }),
  setCurrentEndpoint: (endpoint) => set({ currentEndpoint: endpoint }),
  setError: (error) => set({ error }),
  setUseMockFallback: (value) => set({ useMockFallback: value }),

  checkApiHealth: async () => {
    const endpoints = get().availableEndpoints;
    const useMock = get().useMockFallback;

    set({ status: 'checking', error: null });

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${endpoint}/search?keywords=test&limit=1&timestamp=${Date.now()}`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.code === 200) {
            set({
              status: 'online',
              provider: 'netease',
              currentEndpoint: endpoint,
              lastCheck: Date.now(),
              error: null,
            });
            return true;
          }
        }
      } catch (err) {
        console.log(`Endpoint ${endpoint} failed:`, err);
        continue;
      }
    }

    if (useMock) {
      set({
        status: 'fallback',
        provider: 'mock',
        currentEndpoint: 'local-mock',
        lastCheck: Date.now(),
        error: '网易云API不可用，已切换到本地演示数据',
      });
      return true;
    }

    set({
      status: 'offline',
      provider: 'mock',
      currentEndpoint: 'local-mock',
      lastCheck: Date.now(),
      error: '所有API端点均不可用，请检查网络连接',
    });
    return false;
  },

  resetStatus: () => {
    set({
      status: 'checking',
      error: null,
      lastCheck: null,
    });
  },
}));

export { API_ENDPOINTS };
