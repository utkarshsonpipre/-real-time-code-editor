// Quick check that the chat relay broadcasts with sender identity.
import { io } from 'socket.io-client';

const URL = process.env.BACKEND_URL || 'http://localhost:8080';
const ROOM = 'chat-' + Math.floor(performance.now());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function mk(name) {
  return new Promise((res) => {
    const s = io(URL, { transports: ['websocket'] });
    const got = [];
    s.on('chat:message', (m) => got.push(m));
    s.on('connect', () =>
      s.emit('room:join', { roomId: ROOM, user: { name, color: '#fff' } }, () => res({ s, got })),
    );
  });
}

const a = await mk('Alice');
const b = await mk('Bob');
await wait(200);

a.s.emit('chat:message', { roomId: ROOM, text: 'hello from alice' });
await wait(500);

const msg = b.got.find((m) => m.text === 'hello from alice');
if (!msg) { console.error('❌ FAIL: Bob did not receive the chat message'); process.exit(1); }
if (msg.name !== 'Alice') { console.error(`❌ FAIL: wrong sender name "${msg.name}"`); process.exit(1); }
console.log(`✓ chat relay OK — Bob received "${msg.text}" from ${msg.name}`);
a.s.close(); b.s.close();
process.exit(0);
