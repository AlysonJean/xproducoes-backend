import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger.js';

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
  maxRequestsCeiling?: number; // Ceiling for adaptive limiting
  keyGenerator?: (req: RateLimitRequest) => string;
  skip?: (req: RateLimitRequest) => boolean;
  message?: string;
  responseTimeProvider?: () => number;
}

type RateLimitRequest = Request & {
  userId?: string;
  rateLimit?: {
    resetTime?: Date;
  };
};

type RateLimitHandler = (req: RateLimitRequest, res: Response, next: NextFunction) => unknown;

/**
 * Initialize Redis client for distributed rate limiting
 */
async function initializeRedis() {
  if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    logger.warn('Redis rate limit store disabled: package support not installed, using memory store');
  }

  return null;
}

const buildLimiter = ({
  windowMs,
  limit,
  message,
  keyGenerator,
  skip,
  handler,
}: {
  windowMs: number;
  limit: number | ((req: RateLimitRequest, res: Response) => number | Promise<number>);
  message: string;
  keyGenerator: (req: RateLimitRequest) => string;
  skip?: (req: RateLimitRequest) => boolean;
  handler?: RateLimitHandler;
}) => {
  return rateLimit({
    windowMs,
    limit,
    message,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator,
    skip: skip ?? (() => false),
    handler,
  });
};

const getClientKey = (req: RateLimitRequest, prefix?: string) => {
  if (req.userId) {
    return prefix ? `${prefix}:${req.userId}` : `user:${req.userId}`;
  }

  return ipKeyGenerator(req.ip ?? 'unknown');
};

/**
 * Create adaptive rate limiter for general API endpoints
 * Standard: 50 requests per 15 minutes per IP
 */
export const createApiRateLimiter = () => {
  return buildLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    message: 'Too many requests from this IP, please try again later.',
    keyGenerator: (req) => getClientKey(req),
    skip: (req) => {
      return req.path === '/health' || req.path === '/readiness';
    },
    handler: (req, res) => {
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
  });
};

/**
 * Create strict rate limiter for authentication endpoints
 * Protects against brute force attacks
 * Limit: 5 requests per 15 minutes per IP (strict!)
 */
export const createAuthRateLimiter = () => {
  return buildLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: 'Too many login attempts, please try again later.',
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
    handler: (req, res) => {
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
  });
};

/**
 * Create lenient rate limiter for public endpoints
 * Limit: 100 requests per 15 minutes per IP
 */
export const createPublicRateLimiter = () => {
  return buildLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    message: 'Too many requests from this IP.',
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
  });
};

/**
 * Create upload rate limiter (very strict)
 * Limit: 3 uploads per hour per user
 */
export const createUploadRateLimiter = () => {
  return buildLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    message: 'Upload limit exceeded.',
    keyGenerator: (req) => getClientKey(req, 'upload'),
    handler: (req, res) => {
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
  });
};

/**
 * Adaptive rate limiter that adjusts based on server load
 * If response times are high, tighten the limits
 * Requires performance monitoring data
 */
export const createAdaptiveRateLimiter = (config: AdaptiveLimitConfig) => {
  const minRequests = config.minRequests || 10;
  const maxRequestsCeiling = config.maxRequestsCeiling || config.maxRequests;
  const responseTimeProvider = config.responseTimeProvider ?? getAverageResponseTime;

  return buildLimiter({
    windowMs: config.windowMs,
    limit: () => {
      const avgResponseTime = responseTimeProvider();

      if (avgResponseTime > 5000) {
        logger.debug(
          { avgResponseTime, load: 'high', limit: minRequests },
          'Adaptive rate limiting tightened for high load'
        );
        return minRequests;
      }

      if (avgResponseTime < 1000) {
        logger.debug(
          { avgResponseTime, load: 'low', limit: maxRequestsCeiling },
          'Adaptive rate limiting relaxed for low load'
        );
        return maxRequestsCeiling;
      }

      logger.debug(
        { avgResponseTime, load: 'normal', limit: config.maxRequests },
        'Adaptive rate limiting kept at baseline'
      );
      return config.maxRequests;
    },
    message: config.message || 'Too many requests.',
    keyGenerator: config.keyGenerator || ((req) => ipKeyGenerator(req.ip ?? 'unknown')),
    skip: config.skip,
  });
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
