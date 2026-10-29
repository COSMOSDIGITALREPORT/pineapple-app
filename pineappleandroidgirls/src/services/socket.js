import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://pineapple-backend-f0yj.onrender.com';

let socket = null;
let keepAliveInterval = null;

export function connectSocket(userId) {
  if (socket?.connected) return socket;

  socket = io(BASE_URL, {
    auth: { userId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
    extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    AsyncStorage.getItem('@pineapple_host_is_live').then((val) => {
      const isLive = val === 'true';
      if (isLive) {
        socket.emit('user:online', { userId, isLive: true });
      } else {
        socket.emit('user:offline', { userId, isLive: false });
      }
    }).catch(() => {
      socket.emit('user:offline', { userId, isLive: false });
    });
  });
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });
  socket.on('connect_error', (e) => console.log('Socket error:', e.message));

  // Keep Render.com server awake — ping every 4 min
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  keepAliveInterval = setInterval(() => {
    if (socket?.connected) socket.emit('ping');
    else fetch(BASE_URL + '/health').catch(() => {});
  }, 4 * 60 * 1000);

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (keepAliveInterval) { clearInterval(keepAliveInterval); keepAliveInterval = null; }
  socket?.disconnect();
  socket = null;
}
