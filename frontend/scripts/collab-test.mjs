// Headless end-to-end test of the collaborative sync pipeline.
// Spins up two simulated clients (each a Y.Doc + socket) against a running
// backend, has them edit the same room, and asserts both docs converge.
//
// Run the backend first, then: node scripts/collab-test.mjs
import { io } from 'socket.io-client';
import * as Y from 'yjs';

const URL = process.env.BACKEND_URL || 'http://localhost:4000';
const ROOM = 'test-room-' + Math.floor(performance.now());

const toUint8 = (d) => (d instanceof Uint8Array ? d : new Uint8Array(d));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Minimal stand-in for SocketIOProvider (no awareness/window needed here).
function makeClient(name) {
  const doc = new Y.Doc();
  const socket = io(URL, { transports: ['websocket'] });
  const self = {};

  doc.on('update', (update, origin) => {
    if (origin === self) return;
    socket.emit('doc:update', { roomId: ROOM, update });
  });
  socket.on('doc:update', ({ update }) => Y.applyUpdate(doc, toUint8(update), self));
  socket.on('doc:sync-request', () =>
    socket.emit('doc:sync-state', { roomId: ROOM, update: Y.encodeStateAsUpdate(doc) }),
  );
  socket.on('doc:sync-state', ({ update }) => Y.applyUpdate(doc, toUint8(update), self));

  return new Promise((resolve) => {
    socket.on('connect', () => {
      socket.emit('room:join', { roomId: ROOM, user: { name } }, () => {
        socket.emit('doc:sync-request', { roomId: ROOM });
        resolve({ doc, socket, text: () => doc.getText('monaco').toString() });
      });
    });
  });
}

const fail = (msg) => {
  console.error('❌ FAIL:', msg);
  process.exit(1);
};

const a = await makeClient('Alice');
const b = await makeClient('Bob');
await wait(300);

// Alice types.
a.doc.getText('monaco').insert(0, 'function hello() {}');
await wait(400);
if (b.text() !== 'function hello() {}') fail(`Bob did not receive Alice's edit: "${b.text()}"`);
console.log('✓ Alice -> Bob propagated');

// Bob edits concurrently at a different position.
b.doc.getText('monaco').insert(0, '// header\n');
await wait(400);
if (a.text() !== b.text()) fail(`Docs diverged:\n  A="${a.text()}"\n  B="${b.text()}"`);
console.log('✓ Bob -> Alice propagated, docs converged');

// A late joiner must catch up to current state via sync-request.
const c = await makeClient('Carol');
await wait(500);
if (c.text() !== a.text()) fail(`Late joiner out of sync:\n  C="${c.text()}"\n  A="${a.text()}"`);
console.log('✓ Late joiner (Carol) synced full document');

console.log(`\n✅ ALL CHECKS PASSED — converged document:\n---\n${a.text()}\n---`);
a.socket.close();
b.socket.close();
c.socket.close();
process.exit(0);
