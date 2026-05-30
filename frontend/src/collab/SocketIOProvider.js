import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';

/**
 * A Yjs network provider that syncs a Y.Doc over an existing Socket.IO
 * connection, scoped to a room.
 *
 * Topology is a relay: the backend rebroadcasts every binary blob to the
 * other members of the room without interpreting it. Correctness comes from
 * Yjs being a CRDT — updates are commutative and idempotent, so order and
 * duplication don't matter.
 *
 * Wire events (all payloads are Uint8Array, sent as binary by Socket.IO):
 *   doc:update        incremental document update
 *   doc:sync-request  "I just joined — someone send me the full state"
 *   doc:sync-state    full document state, in response to a sync-request
 *   awareness:update  cursor/selection/presence state
 */
export class SocketIOProvider {
  constructor(socket, roomId, doc) {
    this.socket = socket;
    this.roomId = roomId;
    this.doc = doc;
    this.awareness = new Awareness(doc);

    this._bindDoc();
    this._bindAwareness();
    this._bindSocket();

    // Ask peers for the current document state. New, empty docs simply get
    // an empty diff back; existing rooms get caught up.
    this.socket.emit('doc:sync-request', { roomId: this.roomId });

    // If the socket reconnects after a drop, re-sync.
    this._onReconnect = () => this.socket.emit('doc:sync-request', { roomId: this.roomId });
    this.socket.on('connect', this._onReconnect);
  }

  // --- Document <-> network ------------------------------------------------

  _bindDoc() {
    this._onDocUpdate = (update, origin) => {
      // Don't echo updates that we ourselves applied from the network.
      if (origin === this) return;
      this.socket.emit('doc:update', { roomId: this.roomId, update });
    };
    this.doc.on('update', this._onDocUpdate);
  }

  _bindSocket() {
    this._onRemoteUpdate = ({ update }) => {
      Y.applyUpdate(this.doc, toUint8(update), this);
    };
    this.socket.on('doc:update', this._onRemoteUpdate);

    // A peer joined and wants state — reply with our full document.
    this._onSyncRequest = () => {
      const update = Y.encodeStateAsUpdate(this.doc);
      this.socket.emit('doc:sync-state', { roomId: this.roomId, update });
    };
    this.socket.on('doc:sync-request', this._onSyncRequest);

    // Received full state from a peer — merge it in (idempotent).
    this._onSyncState = ({ update }) => {
      Y.applyUpdate(this.doc, toUint8(update), this);
    };
    this.socket.on('doc:sync-state', this._onSyncState);

    this._onRemoteAwareness = ({ update }) => {
      applyAwarenessUpdate(this.awareness, toUint8(update), this);
    };
    this.socket.on('awareness:update', this._onRemoteAwareness);
  }

  // --- Awareness (cursors / presence) -------------------------------------

  _bindAwareness() {
    this._onAwarenessChange = ({ added, updated, removed }, origin) => {
      if (origin === this) return; // came from the network
      const changed = added.concat(updated, removed);
      const update = encodeAwarenessUpdate(this.awareness, changed);
      this.socket.emit('awareness:update', { roomId: this.roomId, update });
    };
    this.awareness.on('update', this._onAwarenessChange);

    // Clear our awareness state for peers when the tab closes.
    this._onBeforeUnload = () => {
      removeAwarenessStates(this.awareness, [this.doc.clientID], 'window unload');
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this._onBeforeUnload);
    }
  }

  setLocalUser(user) {
    this.awareness.setLocalStateField('user', user);
  }

  destroy() {
    this.doc.off('update', this._onDocUpdate);
    this.awareness.off('update', this._onAwarenessChange);
    this.socket.off('doc:update', this._onRemoteUpdate);
    this.socket.off('doc:sync-request', this._onSyncRequest);
    this.socket.off('doc:sync-state', this._onSyncState);
    this.socket.off('awareness:update', this._onRemoteAwareness);
    this.socket.off('connect', this._onReconnect);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this._onBeforeUnload);
    }
    removeAwarenessStates(this.awareness, [this.doc.clientID], 'provider destroy');
    this.awareness.destroy();
  }
}

// Socket.IO may hand binary back as ArrayBuffer or Buffer depending on the
// platform; normalize to the Uint8Array that Yjs expects.
function toUint8(data) {
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data);
}
