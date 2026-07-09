// Configuração de Telemetria para Monitoramento
import type { Request, Response, NextFunction } from 'express';
import logger from './logger';

interface SlowQuery {
  url: string;
  method: string;
  duration: number;
  timestamp?: Date;
}

export interface MetricsData {
  requests: number;
  errors: number;
  responseTime: number;
  slowQueries: SlowQuery[];
  uptime: number;
}

export interface Alert {
  level: "critical" | "warning";
  message: string;
  timestamp: Date;
}

class MetricsCollector {
  private metrics: MetricsData = {
    requests: 0,
    errors: 0,
    responseTime: 0,
    slowQueries: [],
    uptime: Date.now(),
  };

  private alerts: Alert[] = [];

  getMetrics(): MetricsData {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime,
    };
  }

  incrementRequests() {
    this.metrics.requests++;
  }

  incrementErrors() {
    this.metrics.errors++;
  }

  addSlowQuery(query: SlowQuery) {
    this.metrics.slowQueries.push({
      ...query,
      timestamp: new Date(),
    });
  }

  addAlert(alert: Omit<Alert, "timestamp">) {
    this.alerts.push({
      level: alert.level,
      message: alert.message,
      timestamp: new Date(),
    });
  }

  getAlerts(): Alert[] {
    return this.alerts;
  }

  clearOldAlerts() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneHourAgo);
  }
}

export function configureTelemetry() {
  logger.info('Telemetria configurada');
  
  // Limpar alertas antigos a cada hora
  const telemetryTimer = setInterval(() => {
    metricsCollector.clearOldAlerts();
  }, 60 * 60 * 1000);
  try {
    if (telemetryTimer && typeof telemetryTimer.unref === 'function') {
      telemetryTimer.unref();
    }
  } catch (_e) {
    // ignore
  }
}

export const metricsCollector = new MetricsCollector();

export const observabilityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  metricsCollector.incrementRequests();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      metricsCollector.addSlowQuery({
        url: req.url,
        method: req.method,
        duration,
      });
    }
    
    if (res.statusCode >= 400) {
      metricsCollector.incrementErrors();
      
      if (res.statusCode >= 500) {
        metricsCollector.addAlert({
          level: "critical",
          message: `Server error on ${req.method} ${req.url}`,
        });
      }
    }
  });
  
  logger.info({ method: req.method, path: req.path }, 'Request received');
  next();
};
