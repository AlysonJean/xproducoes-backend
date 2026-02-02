/**
 * Endpoint de métricas no formato Prometheus
 * 
 * Compatível com:
 * - Grafana Cloud
 * - Prometheus
 * - Datadog
 * - New Relic
 * - Qualquer scraper OpenMetrics
 * 
 * Formato: https://prometheus.io/docs/instrumenting/exposition_formats/
 */

import { Request, Response, NextFunction } from 'express';
import { metricsCollector } from '../config/metricsCollector';

/**
 * Middleware de autenticação Basic Auth para endpoint de métricas
 * Grafana Cloud exige autenticação para fazer scrape
 * 
 * Credenciais configuradas via variáveis de ambiente:
 * - METRICS_USER: usuário para acesso (default: "grafana")
 * - METRICS_PASSWORD: senha/token para acesso
 */
export function metricsAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  // Se não há senha configurada, permite acesso livre (desenvolvimento)
  const metricsPassword = process.env.METRICS_PASSWORD;
  if (!metricsPassword) {
    next();
    return;
  }

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Metrics"');
    res.status(401).send('Authentication required');
    return;
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  const expectedUser = process.env.METRICS_USER || 'grafana';
  
  if (username === expectedUser && password === metricsPassword) {
    next();
  } else {
    res.status(401).send('Invalid credentials');
  }
}

/**
 * Converte métricas internas para formato Prometheus/OpenMetrics
 * 
 * @route GET /metrics/prometheus
 */
export function prometheusMetricsEndpoint(req: Request, res: Response): void {
  const metrics = metricsCollector.getPrometheusMetrics();
  
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(metrics);
}
