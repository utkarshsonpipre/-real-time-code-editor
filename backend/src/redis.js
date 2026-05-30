import { createClient } from 'redis';
import { config } from './config.js';

/**
 * Connect the pub/sub client pair used by the Socket.IO Redis adapter.
 *
 * The adapter needs two dedicated connections: one to PUBLISH room events and
 * one held in subscriber mode. Returns `null` if Redis can't be reached, so
 * the server can fall back to the default in-memory adapter and still run as a
 * single instance (handy for quick local dev without Redis).
 */
export async function createRedisClients() {
  const pubClient = createClient({
    url: config.redisUrl,
    socket: {
      connectTimeout: 3000,
      // Give up reconnecting after a handful of tries instead of looping forever.
      reconnectStrategy: (retries) => (retries > 10 ? false : Math.min(retries * 200, 2000)),
    },
  });

  // Without an 'error' listener, node-redis throws on connection blips.
  pubClient.on('error', (err) => console.warn(`[redis] ${err.message}`));

  try {
    await pubClient.connect();
  } catch (err) {
    console.warn(
      `[redis] unavailable (${err.message}) — running single-instance with in-memory adapter`,
    );
    pubClient.removeAllListeners('error');
    try {
      await pubClient.disconnect();
    } catch {
      /* already down */
    }
    return null;
  }

  const subClient = pubClient.duplicate();
  subClient.on('error', (err) => console.warn(`[redis] ${err.message}`));
  await subClient.connect();

  console.log(`[redis] connected: ${config.redisUrl}`);
  return { pubClient, subClient };
}
