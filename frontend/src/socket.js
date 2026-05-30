import { io } from 'socket.io-client';

// Where to reach the backend:
//  - VITE_BACKEND_URL set to a URL/host -> use it (split frontend/backend deploy)
//  - production build, nothing set       -> same origin (single service / Docker+nginx)
//  - dev                                 -> http://localhost:4000 (Vite 5173, backend 4000)
const fromEnv = import.meta.env.VITE_BACKEND_URL;
let BACKEND_URL;
if (fromEnv && fromEnv.trim() !== '') {
  BACKEND_URL = /^https?:\/\//i.test(fromEnv) ? fromEnv : `https://${fromEnv}`;
} else if (import.meta.env.PROD) {
  BACKEND_URL = undefined; // same origin
} else {
  BACKEND_URL = 'http://localhost:4000';
}

// A single shared Socket.IO connection for the whole app. `undefined` connects
// to the page's own origin.
export const socket = io(BACKEND_URL, {
  transports: ['websocket'],
});

export { BACKEND_URL };
