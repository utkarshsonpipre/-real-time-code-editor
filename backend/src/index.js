import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

import { config } from './config.js';
import { createRedisClients } from './redis.js';
import { registerHandlers } from './socket/handlers.js';
import { register, observeIo } from './metrics.js';

// Identifies which backend instance served a request — useful for confirming
// that load is actually spread across instances behind a balancer.
const INSTANCE_ID = process.env.INSTANCE_ID || `pid-${process.pid}`;

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
});

// --- Redis adapter (multi-instance Pub/Sub) --------------------------------
// With the adapter attached, room broadcasts are published to Redis and
// delivered to clients on every instance. Without Redis we fall back to the
// default in-memory adapter (single instance).
const redis = await createRedisClients();
const redisEnabled = Boolean(redis);
if (redis) {
  io.adapter(createAdapter(redis.pubClient, redis.subClient));
  console.log('[socket.io] using Redis adapter — multi-instance ready');
} else {
  console.log('[socket.io] using in-memory adapter — single instance');
}

// --- HTTP routes -----------------------------------------------------------

// Liveness/health probe — used by Docker, the ALB target group, and monitoring.
app.get('/health', (_req, res) => {
  // Count collaboration rooms on this instance (exclude per-socket rooms,
  // which Socket.IO names after the socket id).
  let rooms = 0;
  for (const [name] of io.sockets.adapter.rooms) {
    if (!io.sockets.sockets.has(name)) rooms++;
  }
  res.json({
    status: 'ok',
    instance: INSTANCE_ID,
    redis: redisEnabled,
    connections: io.engine.clientsCount,
    rooms,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Prometheus scrape endpoint.
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/', (_req, res) => {
  res.json({ service: 'rtce-backend', version: '0.1.0', instance: INSTANCE_ID });
});

// --- Socket.IO connections -------------------------------------------------

observeIo(io); // register live gauges backed by Socket.IO state

io.on('connection', (socket) => {
  console.log(`[connection] ${socket.id} (instance ${INSTANCE_ID})`);
  registerHandlers(io, socket);
});

server.listen(config.port, () => {
  console.log(`rtce-backend [${INSTANCE_ID}] listening on :${config.port} (${config.nodeEnv})`);
  console.log(`CORS origins: ${config.corsOrigin.join(', ')}`);
});

// Graceful shutdown so containers stop cleanly.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`\n${signal} received — shutting down`);
    io.close();
    if (redis) {
      await redis.pubClient.quit().catch(() => {});
      await redis.subClient.quit().catch(() => {});
    }
    server.close(() => process.exit(0));
  });
}
