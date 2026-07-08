/**
 * Collector de Métricas para Monitoramento Profissional
 * Baseado em práticas SRE do Google para observabilidade.
 * 
 * Coleta:
 * - Latência de requisições (percentis P50, P95, P99)
 * - Taxa de erros por endpoint
 * - Throughput (requests/segundo)
 * - Métricas de sistema (memória, event loop)
 */

interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: number;
}

interface EndpointStats {
  count: number;
  errorCount: number;
  totalDuration: number;
  durations: number[];
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: RequestMetric[] = [];
  private endpointStats: Map<string, EndpointStats> = new Map();
  private startTime: number = Date.now();
  private maxMetricsHistory = 10000; // Mantém últimas 10k requisições

  private constructor() {
    // Limpar métricas antigas a cada 5 minutos
    const cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    try {
      if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
        cleanupTimer.unref();
      }
    } catch (_e) {
      // ignore
    }
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Registra uma requisição completada
   */
  record(metric: RequestMetric): void {
    this.metrics.push(metric);

    // Atualiza stats do endpoint
    const key = `${metric.method} ${this.normalizePath(metric.path)}`;
    const stats = this.endpointStats.get(key) || {
      count: 0,
      errorCount: 0,
      totalDuration: 0,
      durations: [],
    };

    stats.count++;
    stats.totalDuration += metric.duration;
    stats.durations.push(metric.duration);

    if (metric.statusCode >= 400) {
      stats.errorCount++;
    }

    // Mantém apenas últimas 1000 durações por endpoint para cálculo de percentis
    if (stats.durations.length > 1000) {
      stats.durations = stats.durations.slice(-1000);
    }

    this.endpointStats.set(key, stats);
  }

  /**
   * Normaliza paths para agrupar rotas dinâmicas
   * /api/v1/products/123 -> /api/v1/products/:id
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/gi, '/:uuid');
  }

  /**
   * Calcula percentil de um array de números
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Remove métricas antigas
   */
  private cleanup(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp > fiveMinutesAgo);

    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Retorna métricas no formato Prometheus/OpenMetrics
   * Compatível com Grafana Cloud, Prometheus, Datadog
   */
  getPrometheusMetrics(): string {
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.startTime) / 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > now - 60000);
    const memUsage = process.memoryUsage();

    const lines: string[] = [];

    // Metadata
    lines.push('# HELP nodejs_app_info Application information');
    lines.push('# TYPE nodejs_app_info gauge');
    lines.push(`nodejs_app_info{version="${process.version}",platform="${process.platform}"} 1`);

    // Uptime
    lines.push('# HELP nodejs_app_uptime_seconds Application uptime in seconds');
    lines.push('# TYPE nodejs_app_uptime_seconds counter');
    lines.push(`nodejs_app_uptime_seconds ${uptimeSeconds}`);

    // Memory metrics
    lines.push('# HELP nodejs_heap_used_bytes Heap memory used in bytes');
    lines.push('# TYPE nodejs_heap_used_bytes gauge');
    lines.push(`nodejs_heap_used_bytes ${memUsage.heapUsed}`);

    lines.push('# HELP nodejs_heap_total_bytes Total heap memory in bytes');
    lines.push('# TYPE nodejs_heap_total_bytes gauge');
    lines.push(`nodejs_heap_total_bytes ${memUsage.heapTotal}`);

    lines.push('# HELP nodejs_rss_bytes Resident Set Size in bytes');
    lines.push('# TYPE nodejs_rss_bytes gauge');
    lines.push(`nodejs_rss_bytes ${memUsage.rss}`);

    // HTTP metrics (Counters must be monotonic increasing since start)
    let totalRequestsAccumulated = 0;
    let totalErrorsAccumulated = 0;
    this.endpointStats.forEach(stats => {
      totalRequestsAccumulated += stats.count;
      totalErrorsAccumulated += stats.errorCount;
    });

    lines.push('# HELP http_requests_total Total HTTP requests since startup');
    lines.push('# TYPE http_requests_total counter');
    lines.push(`http_requests_total ${totalRequestsAccumulated}`);

    lines.push('# HELP http_errors_total Total HTTP errors (4xx/5xx) since startup');
    lines.push('# TYPE http_errors_total counter');
    lines.push(`http_errors_total ${totalErrorsAccumulated}`);

    // Latency percentiles
    const allDurations = recentMetrics.map(m => m.duration);
    if (allDurations.length > 0) {
      lines.push('# HELP http_request_duration_seconds HTTP request latency');
      lines.push('# TYPE http_request_duration_seconds summary');
      lines.push(`http_request_duration_seconds{quantile="0.5"} ${this.percentile(allDurations, 50) / 1000}`);
      lines.push(`http_request_duration_seconds{quantile="0.95"} ${this.percentile(allDurations, 95) / 1000}`);
      lines.push(`http_request_duration_seconds{quantile="0.99"} ${this.percentile(allDurations, 99) / 1000}`);
    }

    // Per-endpoint metrics
    lines.push('# HELP http_endpoint_requests_total Requests per endpoint');
    lines.push('# TYPE http_endpoint_requests_total counter');
    this.endpointStats.forEach((stats, key) => {
      const [method, path] = key.split(' ');
      const safePath = path.replace(/"/g, '\\"');
      lines.push(`http_endpoint_requests_total{method="${method}",path="${safePath}"} ${stats.count}`);
    });

    lines.push('# HELP http_endpoint_errors_total Errors per endpoint');
    lines.push('# TYPE http_endpoint_errors_total counter');
    this.endpointStats.forEach((stats, key) => {
      const [method, path] = key.split(' ');
      const safePath = path.replace(/"/g, '\\"');
      lines.push(`http_endpoint_errors_total{method="${method}",path="${safePath}"} ${stats.errorCount}`);
    });

    return lines.join('\n') + '\n';
  }

  /**
   * Retorna métricas agregadas para o endpoint /metrics
   */
  getAggregatedMetrics(): object {
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.startTime) / 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > now - 60000);

    // Métricas de memória
    const memUsage = process.memoryUsage();

    // Calcula latências globais
    const allDurations = recentMetrics.map(m => m.duration);

    // Calcula taxa de erros
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = recentMetrics.length > 0 
      ? (errorCount / recentMetrics.length) * 100 
      : 0;

    // Estatísticas por endpoint
    const endpoints: Record<string, object> = {};
    this.endpointStats.forEach((stats, key) => {
      endpoints[key] = {
        requests: stats.count,
        errors: stats.errorCount,
        errorRate: stats.count > 0 ? ((stats.errorCount / stats.count) * 100).toFixed(2) + '%' : '0%',
        avgLatencyMs: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0,
        p50LatencyMs: this.percentile(stats.durations, 50),
        p95LatencyMs: this.percentile(stats.durations, 95),
        p99LatencyMs: this.percentile(stats.durations, 99),
      };
    });

    return {
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSeconds,
        human: this.formatUptime(uptimeSeconds),
      },
      system: {
        memory: {
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          rssMB: Math.round(memUsage.rss / 1024 / 1024),
          externalMB: Math.round(memUsage.external / 1024 / 1024),
        },
        nodejs: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      },
      traffic: {
        last60Seconds: {
          totalRequests: recentMetrics.length,
          requestsPerSecond: (recentMetrics.length / 60).toFixed(2),
          errors: errorCount,
          errorRate: errorRate.toFixed(2) + '%',
        },
        latency: {
          avgMs: allDurations.length > 0 
            ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length) 
            : 0,
          p50Ms: this.percentile(allDurations, 50),
          p95Ms: this.percentile(allDurations, 95),
          p99Ms: this.percentile(allDurations, 99),
          maxMs: allDurations.length > 0 ? Math.max(...allDurations) : 0,
        },
      },
      endpoints,
    };
  }

  /**
   * Formata uptime em formato legível
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Reseta todas as métricas (útil para testes)
   */
  reset(): void {
    this.metrics = [];
    this.endpointStats.clear();
    this.startTime = Date.now();
  }
}

export const metricsCollector = MetricsCollector.getInstance();
