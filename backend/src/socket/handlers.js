/**
 * Socket.IO event handlers for a single connection.
 *
 * Multi-instance note: every `socket.to(roomId).emit(...)` below is fanned out
 * across all backend instances by the Redis adapter — a client connected to
 * instance A reaches clients on instance B transparently. Presence is derived
 * from `io.in(room).fetchSockets()`, which the adapter answers across the whole
 * cluster, so the member list is globally accurate and never goes stale (the
 * live socket connections themselves are the source of truth — no separate
 * store to leak entries when an instance crashes).
 *
 * Event protocol (client <-> server):
 *   room:join      { roomId, user }     -> ack { members }, broadcasts presence:update
 *   presence:cursor{ roomId, cursor }   -> relays presence:cursor to room
 *   doc:update     { roomId, update }   -> relays Yjs binary update to room
 *   doc:sync-*     { roomId, ... }      -> late-joiner state exchange
 *   awareness:update{ roomId, update }  -> relays cursor/selection state
 *   room:leave     { roomId }           -> broadcasts presence:update
 */
import { metrics } from '../metrics.js';

export function registerHandlers(io, socket) {
  socket.on('room:join', async ({ roomId, user }, ack) => {
    if (!roomId) return ack?.({ error: 'roomId is required' });
    metrics.roomJoins.inc();

    // Stash identity on the socket so it travels with fetchSockets() across
    // instances and shows up in every member list.
    socket.data.user = { ...(user || {}), name: user?.name || 'Anonymous' };

    await socket.join(roomId);
    const members = await getMembers(io, roomId);

    ack?.({ members }); // tell the joiner who's already here
    socket.to(roomId).emit('presence:update', { members, joined: socket.id });

    console.log(`[room:join] ${socket.data.user.name} (${socket.id}) -> ${roomId} (${members.length} present)`);
  });

  socket.on('presence:cursor', ({ roomId, cursor }) => {
    if (!roomId) return;
    socket.to(roomId).emit('presence:cursor', { socketId: socket.id, cursor });
  });

  // Group chat: broadcast to the whole room (including the sender, so their
  // own message appears too). Identity comes from the socket, not the client.
  socket.on('chat:message', ({ roomId, text }) => {
    if (!roomId || !text?.trim()) return;
    io.to(roomId).emit('chat:message', {
      id: `${socket.id}-${Date.now()}`,
      socketId: socket.id,
      name: socket.data.user?.name || 'Anonymous',
      color: socket.data.user?.color || '#6366f1',
      text: String(text).slice(0, 2000),
      ts: Date.now(),
    });
  });

  // --- Yjs CRDT relay ------------------------------------------------------
  // The server is a blind relay: it forwards opaque binary CRDT blobs to the
  // room and never interprets them. Yjs guarantees convergence regardless of
  // delivery order or duplication, which is what makes this safe to fan out
  // through Redis across many instances.

  socket.on('doc:update', ({ roomId, update }) => {
    if (!roomId) return;
    metrics.docUpdates.inc();
    socket.to(roomId).emit('doc:update', { update });
  });

  socket.on('doc:sync-request', ({ roomId }) => {
    if (!roomId) return;
    socket.to(roomId).emit('doc:sync-request', { from: socket.id });
  });

  socket.on('doc:sync-state', ({ roomId, update }) => {
    if (!roomId) return;
    socket.to(roomId).emit('doc:sync-state', { update });
  });

  socket.on('awareness:update', ({ roomId, update }) => {
    if (!roomId) return;
    metrics.awarenessUpdates.inc();
    socket.to(roomId).emit('awareness:update', { update });
  });

  socket.on('room:leave', async ({ roomId }) => {
    if (!roomId) return;
    await socket.leave(roomId);
    const members = await getMembers(io, roomId);
    socket.to(roomId).emit('presence:update', { members, left: socket.id });
  });

  // Fires while socket.rooms is still populated, so we can notify the rooms
  // this socket is leaving. fetchSockets() still includes us here, so filter
  // ourselves out of the member list we send to those who remain.
  socket.on('disconnecting', async () => {
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    for (const roomId of rooms) {
      const members = (await getMembers(io, roomId)).filter((m) => m.socketId !== socket.id);
      socket.to(roomId).emit('presence:update', { members, left: socket.id });
    }
  });

  socket.on('disconnect', () => console.log(`[disconnect] ${socket.id}`));
}

/** Cluster-wide member list for a room (works across instances via the adapter). */
async function getMembers(io, roomId) {
  const sockets = await io.in(roomId).fetchSockets();
  return sockets.map((s) => ({ ...(s.data.user || {}), socketId: s.id }));
}
