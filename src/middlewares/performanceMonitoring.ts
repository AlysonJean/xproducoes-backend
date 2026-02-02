import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";
import { metricsCollector } from "../config/metricsCollector";

/**
 * Middleware para capturar métricas de performance das requisições.
 * Alimenta o MetricsCollector para dashboards SRE.
 */
export function performanceMonitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // Capturar resposta quando terminar
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Registra no collector de métricas
    metricsCollector.record({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: Date.now(),
    });

    // Alerta para requisições lentas (> 2s)
    if (duration > 2000) {
      logger.warn({
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode,
      }, 'Slow request detected');
    }
  });

  next();
}
