import { io } from 'socket.io-client';

// Where to reach the backend:
//  - dev (var unset):         http://localhost:4000 (Vite on 5173, backend on 4000)
//  - same-origin (var=""):    one service serves both API + static site (Render single service,
//                             or Docker+nginx) — connect to the current origin
//  - Render split (host only):a bare hostname like "x.onrender.com" — add https://
const fromEnv = import.meta.env.VITE_BACKEND_URL;
let BACKEND_URL;
if (fromEnv === undefined) {
  BACKEND_URL = 'http://localhost:4000';
} else if (fromEnv === '') {
  BACKEND_URL = undefined; // same origin
} else if (!/^https?:\/\//i.test(fromEnv)) {
  BACKEND_URL = `https://${fromEnv}`;
} else {
  BACKEND_URL = fromEnv;
}

// A single shared Socket.IO connection for the whole app. Passing `undefined`
// connects to the page's own origin.
export const socket = io(BACKEND_URL, {
  transports: ['websocket'],
});

export { BACKEND_URL };
