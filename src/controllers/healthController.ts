import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { CacheService } from '../services/cacheService';
import logger from '../config/logger';
import { metricsCollector } from '../config/metricsCollector';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckDetail;
    cache?: CheckDetail;
  };
}

interface CheckDetail {
  status: 'ok' | 'degraded' | 'error';
  responseTime?: number;
  message?: string;
  error?: string;
}

interface ReadinessCheckResult {
  ready: boolean;
  timestamp: string;
  checks: {
    database: CheckDetail;
    cache?: CheckDetail;
  };
}

/**
 * Health Check Endpoint
 * 
 * Verifica se a aplicação está funcionando corretamente.
 * Retorna status 200 se está saudável, 503 se não está.
 * 
 * Usado por:
 * - Load balancers para routing de tráfego
 * - Ferramentas de monitoramento (Datadog, New Relic)
 * - Kubernetes liveness probes
 * 
 * @route GET /health
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: await checkDatabase(),
      },
    };

    // Verifica cache apenas em produção
    if (process.env.NODE_ENV === 'production') {
      result.checks.cache = await checkCache();
    }

    // Determina status geral baseado nos checks individuais
    const checks = Object.values(result.checks);
    if (checks.some(check => check.status === 'error')) {
      result.status = 'unhealthy';
    } else if (checks.some(check => check.status === 'degraded')) {
      result.status = 'degraded';
    }

    const statusCode = result.status === 'unhealthy' ? 503 : 200;

    logger.info({
      requestId: req.requestId,
      status: result.status,
      duration: Date.now() - startTime,
    }, 'Health check completed');

    res.status(statusCode).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      requestId: req.requestId,
      error: errorMessage,
    }, 'Health check failed');

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: 'Health check failed',
    });
  }
}

/**
 * Readiness Check Endpoint
 * 
 * Verifica se a aplicação está pronta para receber tráfego.
 * Retorna status 200 se está pronta, 503 se não está.
 * 
 * Diferente do /health, este verifica dependências externas.
 * 
 * Usado por:
 * - Kubernetes readiness probes
 * - Load balancers para saber quando começar a rotear tráfego
 * 
 * @route GET /ready
 */
export async function readinessCheck(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    const result: ReadinessCheckResult = {
      ready: true,
      timestamp: new Date().toISOString(),
      checks: {
        database: await checkDatabase(),
      },
    };

    // Verifica cache apenas em produção
    if (process.env.NODE_ENV === 'production') {
      result.checks.cache = await checkCache();
    }

    // Aplicação não está pronta se qualquer check falhar
    const checks = Object.values(result.checks);
    if (checks.some(check => check.status === 'error' || check.status === 'degraded')) {
      result.ready = false;
    }

    const statusCode = result.ready ? 200 : 503;

    logger.info({
      requestId: req.requestId,
      ready: result.ready,
      duration: Date.now() - startTime,
    }, 'Readiness check completed');

    res.status(statusCode).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      requestId: req.requestId,
      error: errorMessage,
    }, 'Readiness check failed');

    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
    });
  }
}

/**
 * Verifica a conexão com o banco de dados PostgreSQL.
 * Executa uma query simples para validar a conectividade.
 */
async function checkDatabase(): Promise<CheckDetail> {
  const startTime = Date.now();

  try {
    // Query simples para verificar conectividade
    await prisma.$queryRaw`SELECT 1 as health_check`;

    const responseTime = Date.now() - startTime;

    // Degradado se a resposta demorar mais de 1 segundo
    const status = responseTime > 1000 ? 'degraded' : 'ok';

    return {
      status,
      responseTime,
      message: status === 'degraded' ? 'Database responding slowly' : 'Database connection healthy',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';

    return {
      status: 'error',
      responseTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Verifica a conexão com o Redis (apenas em produção).
 * Executa um PING para validar a conectividade.
 */
async function checkCache(): Promise<CheckDetail> {
  const startTime = Date.now();

  try {
    const cacheService = CacheService.getInstance();

    // Tenta fazer um set e get simples
    const testKey = '__health_check__';
    const testValue = Date.now().toString();

    await cacheService.set(testKey, testValue, 10); // TTL de 10 segundos
    const retrieved = await cacheService.get<string>(testKey);

    const responseTime = Date.now() - startTime;

    if (retrieved !== testValue) {
      return {
        status: 'degraded',
        responseTime,
        message: 'Cache read/write mismatch',
      };
    }

    // Degradado se a resposta demorar mais de 500ms
    const status = responseTime > 500 ? 'degraded' : 'ok';

    return {
      status,
      responseTime,
      message: status === 'degraded' ? 'Cache responding slowly' : 'Cache connection healthy',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown cache error';

    return {
      status: 'error',
      responseTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Metrics Endpoint - Dashboard SRE
 * 
 * Retorna métricas detalhadas de performance da aplicação.
 * Ideal para integração com Prometheus, Grafana, Datadog.
 * 
 * Métricas incluídas:
 * - Latência por endpoint (P50, P95, P99)
 * - Taxa de erros
 * - Throughput (requests/segundo)
 * - Uso de memória
 * - Uptime
 * 
 * @route GET /metrics
 */
export async function metricsEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const metrics = metricsCollector.getAggregatedMetrics();

    logger.info('Metrics endpoint accessed');

    res.status(200).json(metrics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({ error: errorMessage }, 'Metrics endpoint failed');

    res.status(500).json({
      error: 'Failed to collect metrics',
      timestamp: new Date().toISOString(),
    });
  }
}