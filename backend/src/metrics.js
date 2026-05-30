import client from 'prom-client';

/**
 * Prometheus metrics registry.
 *
 * Exposes default Node.js process metrics (CPU, memory, event loop lag, GC)
 * plus custom application metrics describing the realtime workload. Scraped
 * by Prometheus at /metrics and visualized in Grafana.
 */
export const register = new client.Registry();

const INSTANCE_ID = process.env.INSTANCE_ID || `pid-${process.pid}`;
register.setDefaultLabels({ instance: INSTANCE_ID });

client.collectDefaultMetrics({ register, prefix: 'rtce_' });

// --- Application counters --------------------------------------------------
export const metrics = {
  roomJoins: new client.Counter({
    name: 'rtce_room_joins_total',
    help: 'Total room:join events handled',
    registers: [register],
  }),
  docUpdates: new client.Counter({
    name: 'rtce_doc_updates_total',
    help: 'Total Yjs document updates relayed',
    registers: [register],
  }),
  awarenessUpdates: new client.Counter({
    name: 'rtce_awareness_updates_total',
    help: 'Total awareness (cursor/selection) updates relayed',
    registers: [register],
  }),
};

/**
 * Wire live gauges that read their value from Socket.IO at scrape time.
 * Using collect() callbacks means the numbers are always current without us
 * having to track increments/decrements by hand.
 */
export function observeIo(io) {
  new client.Gauge({
    name: 'rtce_socket_connections',
    help: 'Current open socket connections on this instance',
    registers: [register],
    collect() {
      this.set(io.engine.clientsCount);
    },
  });

  new client.Gauge({
    name: 'rtce_rooms_active',
    help: 'Active collaboration rooms on this instance',
    registers: [register],
    collect() {
      let count = 0;
      for (const [name] of io.sockets.adapter.rooms) {
        // Socket.IO auto-creates a room per socket id; exclude those.
        if (!io.sockets.sockets.has(name)) count++;
      }
      this.set(count);
    },
  });
}
