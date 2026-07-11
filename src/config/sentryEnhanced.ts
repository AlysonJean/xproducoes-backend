import * as Sentry from '@sentry/node';
import logger from './logger.js';
import type { Express, NextFunction, Request, Response } from 'express';

type RequestWithContext = Request & {
  id?: string;
  userId?: string;
  userRole?: string;
};

type ErrorWithStatus = Error & {
  status?: number | string;
  statusCode?: number | string;
};

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

/**
 * Decide se um evento deve ser enviado ao Sentry ou descartado.
 *
 * Extraído do `beforeSend` do Sentry.init (que não pode ser testado diretamente
 * isoladamente) para permitir teste unitário puro. Antes desta correção, este filtro:
 *   1. descartava TODO erro cuja mensagem contivesse "ECONNREFUSED" — inclusive uma
 *      queda real do banco/Redis/serviço dependente, exatamente o tipo de erro crítico
 *      que o monitoramento deveria escalar, não silenciar;
 *   2. descartava aleatoriamente 70% dos erros de banco de dados — durante um incidente
 *      real (quando os erros aumentam), isso reduz a visibilidade em vez de aumentá-la.
 * Ambos foram removidos. O filtro de baixo valor (ENOENT/404) foi mantido.
 */
export function shouldSendSentryEvent(
  event: Sentry.ErrorEvent,
  hint: Sentry.EventHint,
): Sentry.ErrorEvent | null {
  const error = hint.originalException;

  if (error instanceof Error) {
    if (error.message.includes('ENOENT') || error.message.includes('404')) {
      return null;
    }
  }

  return event;
}

export function initSentry(app: Express) {
  const isDev = process.env.NODE_ENV === 'development';
  const dsn = process.env.SENTRY_DSN;

  if (!dsn && !isDev) {
    logger.info('SENTRY_DSN not configured, error tracking disabled');
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

    // Profiling
    profilesSampleRate: isDev ? 1.0 : 0.1,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],

    // Error filtering — ver shouldSendSentryEvent() acima para o porquê e o que
    // deliberadamente NÃO é mais filtrado (ECONNREFUSED e amostragem de erros de banco).
    beforeSend: shouldSendSentryEvent,

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

    // Max breadcrumbs
    maxBreadcrumbs: 50,

    // Attach stack traces
    attachStacktrace: true,

    // Server name (identifies this instance)
    serverName: process.env.HOSTNAME || 'x-producoes-api',
  });

  // Custom middleware to add request context
  app.use((req: RequestWithContext, _res: Response, next: NextFunction) => {
    if (req.id) {
      Sentry.setTag('request_id', req.id);
    }
    if (req.userId) {
      Sentry.setTag('user_id', req.userId);
    }
    if (req.userRole) {
      Sentry.setTag('user_role', req.userRole);
    }

    next();
  });

  logger.info('Sentry initialized for error tracking and performance monitoring');

  return app;
}

/**
 * Error handler for Sentry
 * Must be placed after all other error handlers
 *
 * Achado (upgrade @sentry/node 10.38.0 → 10.65.0, trazido por `npm audit fix --force` ao
 * resolver vulnerabilidades não relacionadas): `Sentry.expressErrorHandler(...)` sozinho
 * retorna `ExpressErrorMiddleware`, um tipo próprio do Sentry que não bate mais com as
 * sobrecargas de `app.use()` do Express nesta versão — `app.use(sentryErrorHandler())`
 * (padrão antigo) parou de compilar. `setupExpressErrorHandler(app, options)` é o padrão
 * atual recomendado pelo próprio Sentry para isso (registra o middleware internamente,
 * com tipagem compatível), então migramos para ele em vez de apenas prender a versão
 * antiga do pacote.
 */
export function sentryErrorHandler(app: Express) {
  Sentry.setupExpressErrorHandler(app, {
    shouldHandleError: (error: ErrorWithStatus) => {
      // Only send errors that are not 4xx status codes
      const status = Number(error.status ?? error.statusCode ?? 500);
      if (status >= 400 && status < 500) {
        return false;
      }
      return true;
    },
  });
}

/**
 * Start a Sentry span for monitoring
 * Useful for tracking critical operations
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startInactiveSpan({
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
  data?: Record<string, unknown>
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
  details?: Record<string, unknown>
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
