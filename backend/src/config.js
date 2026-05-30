import dotenv from 'dotenv';

dotenv.config();

// Parse allowed CORS origins. A literal "*" allows any origin (handy for a
// public demo where the frontend lives on a different host than the backend);
// otherwise it's a comma-separated allow-list.
const rawCors = (process.env.CORS_ORIGIN || 'http://localhost:5173').trim();
const corsOrigin =
  rawCors === '*'
    ? '*'
    : rawCors.split(',').map((o) => o.trim()).filter(Boolean);

/** Centralized, validated runtime configuration. */
export const config = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  nodeEnv: process.env.NODE_ENV || 'development',
};
