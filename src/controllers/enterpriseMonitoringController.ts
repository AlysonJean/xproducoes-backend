import { Request, Response, NextFunction } from "express";
import { enterpriseMonitoringService } from "../services/enterpriseMonitoringService";
import logger from "../config/logger";

export class EnterpriseMonitoringController {

  // ===== DASHBOARD EXECUTIVO PRINCIPAL =====
  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dashboard = await enterpriseMonitoringService.getExecutiveDashboard();
      return res.json(dashboard);
    } catch (error) {
      logger.error("Erro ao buscar dashboard executivo: " + String(error));
      return next(error);
    }
  };

  // ===== VISÃO GERAL DAS INTEGRAÇÕES =====
  getIntegrationsOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integrations = await enterpriseMonitoringService.getIntegrationsOverview();
      return res.json({
        timestamp: new Date(),
        count: integrations.length,
        integrations
      });
    } catch (error) {
      logger.error("Erro ao buscar integrações: " + String(error));
      return next(error);
    }
  };

  // ===== RESUMO DE SAÚDE =====
  getHealthSummary = async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const summary = await enterpriseMonitoringService.getHealthSummary();
      
      // Definir status code baseado na saúde geral
      const statusCode = summary.status === 'healthy' ? 200 : 
                        summary.status === 'warning' ? 207 : 503;
      
      return res.status(statusCode).json(summary);
    } catch (error) {
      logger.error("Erro ao buscar resumo de saúde: " + String(error));
      return res.status(503).json({
        status: 'error',
        error: 'Service monitoring unavailable',
        timestamp: new Date()
      });
    }
  };

  // ===== MÉTRICAS DE PERFORMANCE =====
  getPerformanceMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await enterpriseMonitoringService.getPerformanceMetrics();
      return res.json({
        timestamp: new Date(),
        metrics
      });
    } catch (error) {
      logger.error("Erro ao buscar métricas de performance: " + String(error));
      return next(error);
    }
  };

  // ===== SAÚDE DO SISTEMA =====
  getSystemHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const health = await enterpriseMonitoringService.getSystemHealth();
      return res.json({
        timestamp: new Date(),
        system: health
      });
    } catch (error) {
            logger.error("Erro ao buscar saúde do sistema: " + String(error));
      return next(error);
    }
  };

  // ===== USO DE RECURSOS =====
  getResourceUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usage = await enterpriseMonitoringService.getResourceUsage();
      return res.json(usage);
    } catch (error) {
      logger.error("Erro ao buscar uso de recursos: " + String(error));
      return next(error);
    }
  };

  // ===== TESTE DE INTEGRAÇÃO ESPECÍFICA =====
  testIntegration = async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { name } = req.params as { name: string };
      
      if (!name) {
        return res.status(400).json({ 
          error: 'Nome da integração é obrigatório' 
        });
      }

      const result = await enterpriseMonitoringService.testIntegration(name);
      return res.json({
        integration: name,
        result,
        testedAt: new Date()
      });
    } catch (error) {
      logger.error(`Erro ao testar integração ${req.params.name}: ` + String(error));
      return res.status(500).json({
        error: 'Erro ao testar integração',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // ===== ALERTAS ATIVOS =====
  getActiveAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alerts = await enterpriseMonitoringService.getActiveAlerts();
      return res.json({
        timestamp: new Date(),
        count: alerts.length,
        alerts
      });
    } catch (error) {
      logger.error("Erro ao buscar alertas: " + String(error));
      return next(error);
    }
  };

  // ===== HISTÓRICO DE ALERTAS =====
  getAlertsHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = 50, resolved } = req.query;
      const history = await enterpriseMonitoringService.getAlertsHistory(
        Number(limit),
        resolved === 'true'
      );
      return res.json({
        timestamp: new Date(),
        count: history.length,
        history
      });
    } catch (error) {
      logger.error("Erro ao buscar histórico de alertas: " + String(error));
      return next(error);
    }
  };

  // ===== HEALTH CHECK BÁSICO =====
  healthCheck = async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const summary = await enterpriseMonitoringService.getHealthSummary();
      
      return res.status(summary.status === 'healthy' ? 200 : 503).json({
        status: summary.status,
        timestamp: new Date(),
        uptime: process.uptime(),
        integrations: {
          total: summary.totalIntegrations,
          healthy: summary.healthyIntegrations
        }
      });
    } catch {
      return res.status(503).json({
        status: 'error',
        error: 'Monitoring service unavailable',
        timestamp: new Date()
      });
    }
  };
}

// ===== SINGLETON EXPORT =====
export const enterpriseMonitoringController = new EnterpriseMonitoringController();
