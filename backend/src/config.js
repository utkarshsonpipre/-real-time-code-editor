import dotenv from 'dotenv';

dotenv.config();

/** Centralized, validated runtime configuration. */
export const config = {
  port: Number(process.env.PORT) || 4000,
  // Accept a comma-separated list of origins; "*" allows any (dev convenience).
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  nodeEnv: process.env.NODE_ENV || 'development',
};
