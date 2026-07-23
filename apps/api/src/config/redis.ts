import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from '../common/logging/logger.js';

export const redis = env.REDIS_URL ? createClient({ url: env.REDIS_URL }) : null;
if (redis) {
  redis.on('error', (error) => logger.error({ error }, 'Redis client error'));
  void redis.connect().catch((error) => logger.warn({ error }, 'Redis unavailable; dependent operations may use local fallback'));
}
