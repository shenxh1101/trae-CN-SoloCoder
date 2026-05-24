import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = localStorage.getItem('auth-storage');
    let auth = {};
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.state?.token) {
          auth = { token: parsed.state.token };
        }
      } catch {
        // ignore
      }
    }
    socket = io({
      path: '/socket.io',
      auth,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const updateSocketAuth = (token: string): void => {
  if (socket) {
    socket.auth = { token };
    socket.disconnect();
    socket.connect();
  }
};
