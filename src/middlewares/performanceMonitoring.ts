import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";


/**
 * Middleware para capturar métricas de performance das requisições
 */
export function performanceMonitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // Capturar resposta quando terminar
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    // Monitoramento enterprise está disponível mas não tem método recordRequest
    // por isso vou apenas logar por enquanto
    if (responseTime > 2000) {
      logger.info(`Slow request: ${req.method} ${req.path} - ${responseTime}ms`);
    }
  });

  next();
}
