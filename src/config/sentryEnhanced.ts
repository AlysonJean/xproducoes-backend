import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { logger } from './logger.js';

/**
 * Enhanced Sentry Configuration (2026 Standard)
 * 
 * Implements:
 * - Error tracking with source maps
 * - Performance monitoring (tracing)
 * - Profiling (CPU/memory usage)
 * - Custom breadcrumbs for debugging
 * - Intelligent error sampling
 * - Request correlation with request IDs
 * 
 * Best practices for 2026:
 * - Only sample errors in production (reduce noise)
 * - Trace high-value transactions
 * - Profile critical paths
 * - Integrate with monitoring endpoints
 */

export function initSentry(app: any) {
  const isDev = process.env.NODE_ENV === 'development';
  const dsn = process.env.SENTRY_DSN;

  if (!dsn && !isDev) {
    logger.warn('SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  // Initialize Sentry
  Sentry.init({
    // Project configuration
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',

    // Performance monitoring
    tracesSampleRate: isDev ? 1.0 : 0.1, // 10% in prod, 100% in dev
    tracePropagationTargets: [
      'localhost',
      /^\//,
      process.env.API_URL || 'http://localhost:4000',
    ],

    // Profiling (continuous profiling)
    profilesSampleRate: isDev ? 1.0 : 0.1, // Sample 10% of transactions for profiling in prod
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({
        request: true,
        serverName: true,
      }),
    ],

    // Error filtering & sampling
    beforeSend: (event, hint) => {
      const error = hint.originalException;

      // Don't send 404s or known non-critical errors
      if (error instanceof Error) {
        if (
          error.message.includes('ENOENT') ||
          error.message.includes('404') ||
          error.message.includes('ECONNREFUSED')
        ) {
          return null;
        }
      }

      // Sample database errors (reduce noise)
      if (event?.contexts?.database?.duration) {
        if (Math.random() > 0.3) return null; // Only send 30% of DB errors
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Random plugins/extensions
      'Can\'t find variable: ZiteReader',
      'jigsaw is not defined',
      'ComboSearch is not defined',
      // Network errors (often user-side)
      'NetworkError',
      'Network request failed',
      'Failed to fetch',
    ],

    // Data sanitization
    sanitizer: {
      allowUrls: [],
    },

    // Max breadcrumbs
    maxBreadcrumbs: 50,

    // Attach stack traces
    attachStacktrace: true,

    // Server name (identifies this instance)
    serverName: process.env.HOSTNAME || 'x-producoes-api',
  });

  // Attach request handler middleware
  app.use(Sentry.Handlers.requestHandler());

  // Attach performance monitoring middleware
  app.use(Sentry.Handlers.tracingHandler());

  // Custom middleware to add request context
  app.use((req, res, next) => {
    Sentry.getCurrentScope().setTag('request_id', req.id);
    Sentry.getCurrentScope().setTag('user_id', (req as any).userId);
    Sentry.getCurrentScope().setTag('user_role', (req as any).userRole);

    next();
  });

  logger.info('Sentry initialized for error tracking and performance monitoring');

  return app;
}

/**
 * Error handler for Sentry
 * Must be placed after all other error handlers
 */
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError: (error) => {
      // Only send errors that are not 4xx status codes
      if (error?.status && error.status >= 400 && error.status < 500) {
        return false;
      }
      return true;
    },
  });
}

/**
 * Start a Sentry transaction for monitoring
 * Useful for tracking critical operations
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Track database query performance
 */
export function captureDbQuery(
  query: string,
  duration: number,
  success: boolean,
  error?: Error
) {
  Sentry.captureMessage(
    success ? `DB Query: ${query}` : `DB Error: ${query}`,
    success ? 'info' : 'error'
  );

  const scope = Sentry.getCurrentScope();
  scope.setContext('database', {
    query,
    duration,
    success,
    error: error?.message,
  });
}

/**
 * Track API call performance (external services)
 */
export function captureApiCall(
  serviceName: string,
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number,
  error?: Error
) {
  const level = statusCode >= 400 ? 'warning' : 'info';
  Sentry.captureMessage(
    `${serviceName} ${method} ${endpoint}`,
    level
  );

  const scope = Sentry.getCurrentScope();
  scope.setContext('external_api', {
    service: serviceName,
    endpoint,
    method,
    duration,
    statusCode,
    error: error?.message,
  });
}

/**
 * Track performance metrics
 */
export function captureMetric(
  name: string,
  value: number,
  unit: 'ms' | 'bytes' | 'count' | 'percent'
) {
  Sentry.captureMessage(`Metric: ${name} = ${value}${unit}`, 'info');
}

/**
 * Create breadcrumb for audit trail
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture user action for audit trail
 */
export function captureUserAction(
  userId: string,
  action: string,
  details?: Record<string, any>
) {
  addBreadcrumb(`User: ${action}`, 'user-action', 'info', details);

  const scope = Sentry.getCurrentScope();
  scope.setUser({
    id: userId,
    ip_address: '{{auto}}',
  });
}

export default {
  initSentry,
  sentryErrorHandler,
  startTransaction,
  captureDbQuery,
  captureApiCall,
  captureMetric,
  addBreadcrumb,
  captureUserAction,
};
