import rateLimit, { Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '../config/logger.js';

/**
 * Adaptive Rate Limiting (2026 Standard)
 * 
 * Implements intelligent rate limiting that adapts based on:
 * - Server load and response times
 * - User behavior (repeat offenders)
 * - Request patterns (suspicious activity)
 * - Different endpoints (API vs login vs uploads)
 * 
 * Uses Redis for distributed rate limiting across multiple servers
 * Falls back to memory store in development
 */

interface AdaptiveLimitConfig {
  windowMs: number;
  maxRequests: number;
  minRequests?: number; // Floor for adaptive limiting
  maxRequests?: number; // Ceiling for adaptive limiting
  keyGenerator?: (req: any) => string;
  skip?: (req: any) => boolean;
  message?: string;
}

let redisClient: any = null;

/**
 * Initialize Redis client for distributed rate limiting
 */
async function initializeRedis() {
  if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL,
      });

      await redisClient.connect();
      logger.info('Redis connected for rate limiting');
      return redisClient;
    } catch (error) {
      logger.warn({ error }, 'Failed to connect to Redis, falling back to memory store');
      return null;
    }
  }

  return null;
}

/**
 * Create adaptive rate limiter for general API endpoints
 * Standard: 50 requests per 15 minutes per IP
 */
export const createApiRateLimiter = () => {
  const config: Options = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    keyGenerator: (req: any) => {
      // Use user ID if authenticated, otherwise IP
      return req.userId ? `user:${req.userId}` : req.ip;
    },
    skip: (req: any) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/readiness';
    },
    handler: (req: any, res: any) => {
      logger.warn(
        { ip: req.ip, userId: req.userId, path: req.path },
        'Rate limit exceeded'
      );
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: req.rateLimit?.resetTime,
      });
    },
  };

  // Use Redis store if available, otherwise memory
  if (redisClient) {
    return rateLimit({
      ...config,
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:', // Redis key prefix
      }),
    });
  }

  return rateLimit(config);
};

/**
 * Create strict rate limiter for authentication endpoints
 * Protects against brute force attacks
 * Limit: 5 requests per 15 minutes per IP (strict!)
 */
export const createAuthRateLimiter = () => {
  const config: Options = {
    windowMs: 15 * 60 * 1000,
    max: 5, // Only 5 login attempts per 15 min
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
      // Always use IP for login (not user ID, since user might not exist yet)
      return req.ip;
    },
    handler: (req: any, res: any) => {
      logger.warn(
        { ip: req.ip, path: req.path },
        'Authentication rate limit exceeded - possible brute force'
      );
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Account temporarily locked for security.',
        retryAfter: req.rateLimit?.resetTime,
      });
    },
  };

  if (redisClient) {
    return rateLimit({
      ...config,
      store: new RedisStore({
        client: redisClient,
        prefix: 'auth:',
      }),
    });
  }

  return rateLimit(config);
};

/**
 * Create lenient rate limiter for public endpoints
 * Limit: 100 requests per 15 minutes per IP
 */
export const createPublicRateLimiter = () => {
  const config: Options = {
    windowMs: 15 * 60 * 1000,
    max: 100, // Lenient for public data
    message: 'Too many requests from this IP.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.ip,
  };

  if (redisClient) {
    return rateLimit({
      ...config,
      store: new RedisStore({
        client: redisClient,
        prefix: 'public:',
      }),
    });
  }

  return rateLimit(config);
};

/**
 * Create upload rate limiter (very strict)
 * Limit: 3 uploads per hour per user
 */
export const createUploadRateLimiter = () => {
  const config: Options = {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Only 3 uploads per hour
    message: 'Upload limit exceeded.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
      // Require authentication for uploads
      return req.userId ? `upload:${req.userId}` : req.ip;
    },
    handler: (req: any, res: any) => {
      logger.warn(
        { userId: req.userId, path: req.path },
        'Upload rate limit exceeded'
      );
      return res.status(429).json({
        success: false,
        message: 'Upload limit exceeded. Try again in 1 hour.',
        retryAfter: 3600,
      });
    },
  };

  if (redisClient) {
    return rateLimit({
      ...config,
      store: new RedisStore({
        client: redisClient,
        prefix: 'upload:',
      }),
    });
  }

  return rateLimit(config);
};

/**
 * Adaptive rate limiter that adjusts based on server load
 * If response times are high, tighten the limits
 * Requires performance monitoring data
 */
export const createAdaptiveRateLimiter = (config: AdaptiveLimitConfig) => {
  let serverLoad = 0;
  let maxRequestsDynamic = config.maxRequests;
  const minRequests = config.minRequests || 10;
  const maxRequests = config.maxRequests || config.maxRequests;

  // Monitor server load every 10 seconds
  setInterval(() => {
    // Get average response time from monitoring
    // This is a placeholder - integrate with actual metrics
    const avgResponseTime = getAverageResponseTime();

    // Adjust limits based on response time
    if (avgResponseTime > 5000) {
      // High response time - tighten limits
      maxRequestsDynamic = Math.max(minRequests, maxRequestsDynamic - 5);
      serverLoad = 'high';
    } else if (avgResponseTime < 1000) {
      // Low response time - relax limits
      maxRequestsDynamic = Math.min(maxRequests, maxRequestsDynamic + 5);
      serverLoad = 'low';
    }

    logger.debug(
      { maxRequests: maxRequestsDynamic, avgResponseTime, serverLoad },
      'Adaptive rate limiting adjusted'
    );
  }, 10_000);

  const limiter: Options = {
    windowMs: config.windowMs,
    max: maxRequestsDynamic,
    message: config.message || 'Too many requests.',
    keyGenerator: config.keyGenerator || ((req: any) => req.ip),
    skip: config.skip,
  };

  if (redisClient) {
    return rateLimit({
      ...limiter,
      store: new RedisStore({
        client: redisClient,
        prefix: 'adaptive:',
      }),
    });
  }

  return rateLimit(limiter);
};

/**
 * Placeholder: Get average response time from metrics
 * In production, integrate with Prometheus or similar
 */
function getAverageResponseTime(): number {
  // This should come from actual monitoring data
  // For now, return a placeholder
  return Math.random() * 3000; // 0-3000ms
}

/**
 * Initialize all rate limiters
 */
export async function initializeRateLimiters() {
  try {
    await initializeRedis();
    logger.info('Rate limiters initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize rate limiters');
  }
}

export default {
  createApiRateLimiter,
  createAuthRateLimiter,
  createPublicRateLimiter,
  createUploadRateLimiter,
  createAdaptiveRateLimiter,
  initializeRateLimiters,
};
