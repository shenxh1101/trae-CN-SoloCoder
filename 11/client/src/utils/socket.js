import { io } from 'socket.io-client';

let socket = null;

const getSocket = () => {
  if (!socket) {
    socket = io({
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
  }
  return socket;
};

const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export { getSocket, connectSocket, disconnectSocket };
