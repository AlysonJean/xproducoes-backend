/**
 * Redis Singleton — one base connection shared across all services.
 *
 * BullMQ and Socket.IO adapters must call .duplicate() to get their own
 * connection derived from this base; this keeps total open connections minimal
 * (critical for free-tier Redis with low client limits).
 *
 * All IORedis instances created here have an 'error' handler so that an
 * unhandled-error exception can never crash the process.
 */

import IORedis from 'ioredis';
import logger from './logger.js';

let _client: IORedis | null = null;

function safeErrorHandler(source: string) {
  return (err: Error) => {
    logger.warn({ err: err.message, source }, 'Redis connection error — continuing with memory fallback');
  };
}

export function getRedisClient(): IORedis {
  if (_client) return _client;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  _client = new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 5000,
    commandTimeout: 3000,
    retryStrategy: (times) => {
      if (times > 3) return null; // stop retrying — avoids endless reconnects
      return Math.min(times * 500, 2000);
    },
  });

  _client.on('error', safeErrorHandler('redis-main'));

  _client.once('ready', () => {
    logger.info('Redis connection ready');
    // Attempt to set noeviction policy (required by BullMQ).
    // Managed providers (Upstash) may reject this — silence the error.
    _client!.config('SET', 'maxmemory-policy', 'noeviction').catch(() => {
      // CONFIG SET not permitted — must be set via provider dashboard
    });
  });

  return _client;
}

/**
 * Create a duplicate of the singleton — use when a module needs its own
 * connection (e.g. BullMQ workers, Socket.IO pub/sub).
 * Error handler is attached automatically.
 */
export function duplicateRedisClient(source: string): IORedis {
  const dup = getRedisClient().duplicate();
  dup.on('error', safeErrorHandler(source));
  return dup;
}
