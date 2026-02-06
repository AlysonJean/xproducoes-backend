import * as Sentry from "@sentry/node";
import { Express, Request, Response, NextFunction } from "express";
import logger from "./logger";

/**
 * Configuração do Sentry para monitoramento de erros no backend
 */

const SENTRY_DSN = process.env.SENTRY_DSN_BACKEND;
const isProduction = process.env.NODE_ENV === "production";

export function initSentry(app: Express): void {
  if (!SENTRY_DSN) {
    if (isProduction) {
      logger.warn("SENTRY_DSN_BACKEND não configurado. Monitoramento de erros desabilitado.");
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    release: process.env.npm_package_version || "1.0.0",
    
    // Performance monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% em produção, 100% em dev
    
    // Configurações de integração
    integrations: [
      // HTTP integration para rastrear requests
      Sentry.httpIntegration(),
      // Express integration
      Sentry.expressIntegration(),
    ],
    
    // Filtrar dados sensíveis
    beforeSend(event) {
      // Remove dados sensíveis de erros
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      if (event.request?.data) {
        // Remove senhas e tokens de payloads
        const sensitiveKeys = ["password", "token", "refreshToken", "accessToken", "secret"];
        for (const key of sensitiveKeys) {
          if (typeof event.request.data === "object" && event.request.data && key in event.request.data) {
            (event.request.data as Record<string, unknown>)[key] = "[FILTERED]";
          }
        }
      }
      return event;
    },
  });
}

/**
 * Middleware para capturar erros e enviar ao Sentry
 */
export function sentryErrorHandler() {
  return Sentry.expressErrorHandler();
}

/**
 * Adiciona contexto do usuário ao Sentry
 */
export function setSentryUser(userId: string, email?: string, role?: string): void {
  Sentry.setUser({
    id: userId,
    email,
    role,
  });
}

/**
 * Remove contexto do usuário (logout)
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Captura exceção manualmente
 */
export function captureException(error: Error, context?: Record<string, unknown>): string {
  return Sentry.captureException(error, { extra: context });
}

/**
 * Captura mensagem manualmente
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info"): string {
  return Sentry.captureMessage(message, level);
}

/**
 * Middleware para adicionar contexto de request ao Sentry
 */
export function sentryRequestContext(req: Request, _res: Response, next: NextFunction): void {
  // Adiciona contexto customizado ao escopo
  Sentry.setExtra("requestId", req.headers["x-request-id"] || "unknown");
  Sentry.setTag("endpoint", `${req.method} ${req.path}`);
  next();
}

export default {
  initSentry,
  sentryErrorHandler,
  setSentryUser,
  clearSentryUser,
  captureException,
  captureMessage,
  sentryRequestContext,
};
