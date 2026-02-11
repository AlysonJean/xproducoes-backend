// Configuração de Telemetria para Monitoramento
import logger from './logger';

export interface MetricsData {
  requests: number;
  errors: number;
  responseTime: number;
  slowQueries: any[];
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

  addSlowQuery(query: any) {
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
  setInterval(() => {
    metricsCollector.clearOldAlerts();
  }, 60 * 60 * 1000);
}

export const metricsCollector = new MetricsCollector();

export const observabilityMiddleware = (req: any, res: any, next: any) => {
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
