// Cross-instance test: proves the Redis adapter fans out room traffic between
// SEPARATE backend instances. Alice connects to instance A, Bob to instance B.
// If they converge, Redis Pub/Sub is doing its job.
//
// Requires: Redis running, plus two backends on URL_A and URL_B.
import { io } from 'socket.io-client';
import * as Y from 'yjs';

const URL_A = process.env.URL_A || 'http://localhost:4000';
const URL_B = process.env.URL_B || 'http://localhost:4001';
const ROOM = 'xinstance-' + Math.floor(performance.now());

const toUint8 = (d) => (d instanceof Uint8Array ? d : new Uint8Array(d));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (m) => { console.error('❌ FAIL:', m); process.exit(1); };

function makeClient(name, url) {
  const doc = new Y.Doc();
  const socket = io(url, { transports: ['websocket'] });
  const self = {};
  let members = [];

  doc.on('update', (u, origin) => {
    if (origin === self) return;
    socket.emit('doc:update', { roomId: ROOM, update: u });
  });
  socket.on('doc:update', ({ update }) => Y.applyUpdate(doc, toUint8(update), self));
  socket.on('doc:sync-request', () =>
    socket.emit('doc:sync-state', { roomId: ROOM, update: Y.encodeStateAsUpdate(doc) }));
  socket.on('doc:sync-state', ({ update }) => Y.applyUpdate(doc, toUint8(update), self));
  socket.on('presence:update', (p) => { members = p.members; });

  return new Promise((resolve) => {
    socket.on('connect', () => {
      socket.emit('room:join', { roomId: ROOM, user: { name } }, (res) => {
        members = res.members || [];
        socket.emit('doc:sync-request', { roomId: ROOM });
        resolve({
          name, doc, socket,
          text: () => doc.getText('monaco').toString(),
          members: () => members,
        });
      });
    });
  });
}

console.log(`Alice -> ${URL_A}\nBob   -> ${URL_B}\nroom: ${ROOM}\n`);

const alice = await makeClient('Alice', URL_A);
const bob = await makeClient('Bob', URL_B);
await wait(400);

// Presence must span instances: Bob joined second, so Alice should now see 2.
if (alice.members().length !== 2) fail(`Alice sees ${alice.members().length} members, expected 2 (cross-instance presence)`);
console.log('✓ Cross-instance presence: Alice sees Bob (2 members)');

// Edit on instance A must reach instance B through Redis.
alice.doc.getText('monaco').insert(0, 'const x = 42;');
await wait(500);
if (bob.text() !== 'const x = 42;') fail(`Bob (instance B) did not get Alice's edit: "${bob.text()}"`);
console.log('✓ Edit A→B propagated across instances via Redis');

// And back the other way.
bob.doc.getText('monaco').insert(0, '// shared\n');
await wait(500);
if (alice.text() !== bob.text()) fail(`Diverged:\n  A="${alice.text()}"\n  B="${bob.text()}"`);
console.log('✓ Edit B→A propagated; documents converged');

console.log(`\n✅ MULTI-INSTANCE SYNC WORKS — converged document:\n---\n${alice.text()}\n---`);
alice.socket.close();
bob.socket.close();
process.exit(0);
