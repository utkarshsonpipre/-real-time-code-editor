import { io } from 'socket.io-client';

// Where to reach the backend:
//  - dev (var unset):       http://localhost:4000 (Vite on 5173, backend on 4000)
//  - Docker build (var=""): same origin — nginx reverse-proxies /socket.io
const fromEnv = import.meta.env.VITE_BACKEND_URL;
const BACKEND_URL = fromEnv === undefined ? 'http://localhost:4000' : fromEnv;

// A single shared Socket.IO connection for the whole app.
export const socket = io(BACKEND_URL, {
  transports: ['websocket'],
});

export { BACKEND_URL };
