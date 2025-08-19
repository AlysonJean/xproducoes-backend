// backend/src/routes/monitoringRoutes.ts
import { Router, Request, Response, type Router as RouterType } from "express";
import logger from "../config/logger";
import {
  metricsCollector,
  type Alert,
} from "../config/telemetry";
import { prisma } from "../config/prisma";

const router: RouterType = Router();

// Dashboard principal de monitoramento
router.get("/dashboard", async (_req: Request, res: Response) => {
  try {
    const metrics = metricsCollector.getMetrics();

    // Adicionar dados do banco de dados
    const dbStats = await getDatabaseStats();

    res.json({
      metrics,
      database: {
        ...dbStats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to generate dashboard data: " + String(error));
    res.status(500).json({ error: "Failed to generate dashboard data" });
  }
});

// Endpoint para alertas do sistema
router.get("/alerts", (req: Request, res: Response) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const alerts = metricsCollector.getAlerts();

    const alertsSummary = {
      critical: alerts.filter((a: Alert) => a.level === "critical").length,
      warning: alerts.filter((a: Alert) => a.level === "warning").length,
    };

    res.json({
      alerts,
      summary: alertsSummary,
      metrics: {
        requests: metrics.requests,
        errors: metrics.errors,
        uptime: metrics.uptime,
      },
    });
  } catch (error) {
    logger.error("Erro ao obter alertas: " + String(error));
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Endpoint para queries lentas
router.get("/slow-queries", (req: Request, res: Response) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const limit = parseInt(req.query.limit as string) || 50;

    const slowQueries = metrics.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map((query) => ({
        ...query,
        formattedDuration: `${Math.round(query.duration)}ms`,
        relativeTime: getRelativeTime(query.timestamp),
      }));

    res.json({
      queries: slowQueries,
      total: metrics.slowQueries.length,
      threshold: 1000, // ms
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get slow queries: " + String(error));
    res.status(500).json({ error: "Failed to get slow queries" });
  }
});

// Endpoint para métricas do sistema
router.get("/metrics", (req: Request, res: Response) => {
  try {
    const metrics = metricsCollector.getMetrics();
    
    res.json({
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Erro ao obter métricas: " + String(error));
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Endpoint para logs recentes
router.get("/logs", (req: Request, res: Response) => {
  try {
    const level = (req.query.level as string) || "info";
    const limit = parseInt(req.query.limit as string) || 100;

    // Esta implementação retorna logs mockados
    // Em produção, você conectaria ao sistema de logs real
    const logs = generateMockLogs(level, limit);

    res.json({
      logs,
      level,
      count: logs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get logs: " + String(error));
    res.status(500).json({ error: "Failed to get logs" });
  }
});

// Endpoint para configuração de monitoramento
router.get("/config", (_req: Request, res: Response) => {
  try {
    res.json({
      telemetry: {
        provider: process.env["TELEMETRY_PROVIDER"] || "none",
        enabled: process.env["TELEMETRY_PROVIDER"] !== "none",
        environment: process.env["NODE_ENV"] || "development",
      },
      observability: {
        logLevel: process.env["LOG_LEVEL"] || "info",
        metricsEnabled: true,
        slowQueryThreshold: 1000, // ms
      },
      thresholds: {
        responseTime: 1000,
        errorRate: 0.05,
        memoryUsage: 0.8,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get monitoring config: " + String(error));
    res.status(500).json({ error: "Failed to get monitoring config" });
  }
});

// Funções auxiliares
async function getDatabaseStats() {
  try {
    const stats = await Promise.all([
      prisma.user.count(),
      prisma.booking.count(),
      prisma.equipment.count(),
      prisma.kit.count(),
      prisma.review.count(),
    ]);

    return {
      tables: {
        users: stats[0],
        bookings: stats[1],
        equipment: stats[2],
        kits: stats[3],
        reviews: stats[4],
      },
      totalRecords: stats.reduce(
        (sum: number, count: number) => sum + count,
        0,
      ),
    };
  } catch (error) {
    logger.error("Failed to get database stats: " + String(error));
    return {
      tables: {},
      totalRecords: 0,
      error: "Failed to connect to database",
    };
  }
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
  return `${Math.round(diff / 86400000)}d ago`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function generateMockLogs(level: string, limit: number) {
  // Em produção, isso seria substituído por uma conexão real ao sistema de logs
  const levels = ["error", "warn", "info", "debug"];
  const mockLogs = [];

  for (let i = 0; i < limit; i++) {
    const logLevel = levels[Math.floor(Math.random() * levels.length)];
    if (level !== "all" && logLevel !== level) continue;

    mockLogs.push({
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      level: logLevel,
      message: `Sample ${logLevel} message ${i}`,
      service: "x-producoes-backend",
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    });
  }

  return mockLogs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export default Router;
