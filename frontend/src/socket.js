import { io } from 'socket.io-client';

// Where to reach the backend:
//  - dev (var unset):        http://localhost:4000 (Vite on 5173, backend on 4000)
//  - Docker build (var=""):  same origin — nginx reverse-proxies /socket.io
//  - Render (var=host only): a bare hostname like "x.onrender.com" — add https://
const fromEnv = import.meta.env.VITE_BACKEND_URL;
let BACKEND_URL;
if (fromEnv === undefined) {
  BACKEND_URL = 'http://localhost:4000';
} else if (fromEnv !== '' && !/^https?:\/\//i.test(fromEnv)) {
  BACKEND_URL = `https://${fromEnv}`;
} else {
  BACKEND_URL = fromEnv; // full URL, or "" for same-origin
}

// A single shared Socket.IO connection for the whole app.
export const socket = io(BACKEND_URL, {
  transports: ['websocket'],
});

export { BACKEND_URL };
