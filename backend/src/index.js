import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
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

// Single-service mode: if the built frontend is present, this server also
// serves it, so the whole app runs as ONE deployment at one URL.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, '../../frontend/dist');
const serveClient = fs.existsSync(path.join(CLIENT_DIR, 'index.html'));

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
});

// --- Redis adapter (multi-instance Pub/Sub) --------------------------------
// Connected in the background AFTER the server starts listening (below), so a
// slow or absent Redis never delays the port from opening. Without Redis we
// run single-instance with the default in-memory adapter.
let redisEnabled = false;
let redisClients = null;

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

// Serve the built frontend (single-service mode). API routes above take
// precedence; Socket.IO handles /socket.io at the HTTP-server level, so the
// SPA fallback below never intercepts it. When dist isn't present (e.g. the
// Docker setup where nginx serves the client), this is skipped.
if (serveClient) {
  app.use(express.static(CLIENT_DIR));
  app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));
  console.log(`[static] serving frontend from ${CLIENT_DIR}`);
} else {
  app.get('/', (_req, res) => {
    res.json({ service: 'rtce-backend', version: '0.1.0', instance: INSTANCE_ID });
  });
}

// --- Socket.IO connections -------------------------------------------------

observeIo(io); // register live gauges backed by Socket.IO state

io.on('connection', (socket) => {
  console.log(`[connection] ${socket.id} (instance ${INSTANCE_ID})`);
  registerHandlers(io, socket);
});

// Start listening immediately so the platform detects the open port right
// away (Render/ECS health checks don't wait on Redis).
server.listen(config.port, () => {
  const origins = Array.isArray(config.corsOrigin)
    ? config.corsOrigin.join(', ')
    : config.corsOrigin;
  console.log(`rtce-backend [${INSTANCE_ID}] listening on :${config.port} (${config.nodeEnv})`);
  console.log(`CORS origins: ${origins}`);
});

// Connect Redis in the background and attach the adapter when it's ready.
// Purely optional — the app is fully functional single-instance without it.
createRedisClients()
  .then((redis) => {
    if (redis) {
      io.adapter(createAdapter(redis.pubClient, redis.subClient));
      redisClients = redis;
      redisEnabled = true;
      console.log('[socket.io] using Redis adapter — multi-instance ready');
    } else {
      console.log('[socket.io] using in-memory adapter — single instance');
    }
  })
  .catch((err) => {
    console.warn(`[redis] setup failed: ${err.message} — staying single-instance`);
  });

// Graceful shutdown so containers stop cleanly.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`\n${signal} received — shutting down`);
    io.close();
    if (redisClients) {
      await redisClients.pubClient.quit().catch(() => {});
      await redisClients.subClient.quit().catch(() => {});
    }
    server.close(() => process.exit(0));
  });
}
