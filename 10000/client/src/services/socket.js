import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('token') || ''
  }
});

export const connectSocket = (token) => {
  socket.auth.token = token;
  socket.connect();
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export default socket;
