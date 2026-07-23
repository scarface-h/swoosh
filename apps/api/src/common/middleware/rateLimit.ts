import rateLimit from 'express-rate-limit';
import { sendError } from '../http/response.js';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../../config/redis.js';

const handler = (_req: unknown, res: unknown) =>
  sendError(res as never, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please slow down.');
const store = (prefix: string) => {
  const client = redis;
  return client
    ? new RedisStore({ prefix, sendCommand: (...args: string[]) => client.sendCommand(args) })
    : undefined;
};

/** General API limiter. */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  store: store('rl:api:'),
});

/** Stricter limiter for authentication endpoints (brute-force protection). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  store: store('rl:auth:'),
});

/** Checkout / order creation limiter. */
export const checkoutLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  store: store('rl:checkout:'),
});
