/**
 * ✅ ENTERPRISE MONITORING SERVICE
 * Sistema de monitoramento enterprise para todas as integrações e saúde do sistema
 */

import { prisma } from "../config/database";
import { cacheService } from "./cacheService";
import logger from "../config/logger";
import os from "os";
import * as si from "systeminformation";
import { AppError } from "../utils/errors";

interface IntegrationHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  responseTime: number;
  lastCheck: Date;
  errorMessage?: string;
  metadata?: unknown;
}

interface SystemHealth {
  cpu: {
    usage: number;
    cores: number;
    model: string;
    loadAverage?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
    swapUsed?: number;
    swapTotal?: number;
  };
  disk: {
    usage: number;
    total?: number;
    bg?: string;
  };
  os?: {
    platform: string;
    distro: string;
    release: string;
    hostname: string;
  };
  uptime: number;
  environment?: string;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  integration: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

class EnterpriseMonitoringService {
  private prisma: typeof prisma;
  private alerts: Alert[] = [];
  private healthChecks: Map<string, IntegrationHealth> = new Map();
  private isMonitoring = false;

  constructor() {
    this.prisma = prisma;
    this.startBackgroundMonitoring();
  }

  // ===== BACKGROUND MONITORING =====
  private startBackgroundMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    // Modificado para evitar uso excessivo de DB Neon em tier free
    // setInterval(() => this.performHealthChecks(), 30000); // Removido: poll a cada 30 segundos
    
    // Opção: Pode usar um endpoint de health check ao invés de background polling

  }

  private async performHealthChecks(): Promise<void> {
    const integrations = ['database', 'cache', 'cloudinary', 'smtp', 'ai'];
    
    for (const integration of integrations) {
      try {
        const health = await this.checkIntegrationWithRetry(integration);
        this.healthChecks.set(integration, health);
        
        // Auto-resolve alerts if health is restored
        if (health.status === 'healthy') {
          this.resolveAlertsForIntegration(integration);
        }
      } catch (error) {
        logger.error(`Background check failed for ${integration}: ` + String(error));
      }
    }
  }

  // ===== INTEGRATION TESTING =====
  async testIntegration(name: string): Promise<IntegrationHealth> {
    return await this.checkIntegrationWithRetry(name);
  }

  private async checkIntegrationWithRetry(
    integration: string, 
    retries: number = 3
  ): Promise<IntegrationHealth> {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await this.checkSingleIntegration(integration);
        if (result.status !== 'error' || i === retries - 1) {
          return result;
        }
        await this.sleep(1000 * (i + 1)); // Exponential backoff
      } catch (error) {
        if (i === retries - 1) {
          return {
            name: integration,
            status: 'error',
            responseTime: 0,
            lastCheck: new Date(),
            errorMessage: String(error)
          };
        }
      }
    }
    
    throw new AppError(`All retries failed for ${integration}`, 503, true, "INTEGRATION_RETRY_FAILED");
  }

  private async checkSingleIntegration(integration: string): Promise<IntegrationHealth> {
    const startTime = Date.now();
    
    try {
      switch (integration) {
        case 'database':
          await this.checkDatabase();
          break;
        case 'cache':
          await this.checkCache();
          break;
        case 'cloudinary':
          await this.checkCloudinary();
          break;
        case 'smtp':
          await this.checkSMTP();
          break;
        case 'ai':
          await this.checkAI();
          break;
        default:
          throw new AppError(`Unknown integration: ${integration}`, 400, true, "UNKNOWN_INTEGRATION");
      }

      const responseTime = Date.now() - startTime;
      return {
        name: integration,
        status: responseTime < 2000 ? 'healthy' : 'warning',
        responseTime,
        lastCheck: new Date()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = String(error);
      
      // Create alert for failed integration
      this.createAlert('error', integration, `Integration failed: ${errorMessage}`);
      
      return {
        name: integration,
        status: 'error',
        responseTime,
        lastCheck: new Date(),
        errorMessage
      };
    }
  }

  // ===== INDIVIDUAL INTEGRATION CHECKS =====
  private async checkDatabase(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkCache(): Promise<void> {
    const testKey = 'health-check-' + Date.now();
    await cacheService.set(testKey, 'test', 10);
    const result = await cacheService.get(testKey);
    if (result !== 'test') {
      throw new AppError('Cache read/write test failed', 503, true, "CACHE_CHECK_FAILED");
    }
  }

  private async checkCloudinary(): Promise<void> {
    // Simulate Cloudinary check
    if (!process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_CLOUD_NAME) {
      throw new AppError('Cloudinary not configured', 503, true, "CLOUDINARY_NOT_CONFIGURED");
    }
  }

  private async checkSMTP(): Promise<void> {
    // Simulate SMTP check
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      throw new AppError('SMTP not configured', 503, true, "SMTP_NOT_CONFIGURED");
    }
  }

  private async checkAI(): Promise<void> {
    // Check for either Gemini or Hugging Face (HUGGIE) configuration
    if (!process.env.GEMINI_API_KEY && !process.env.HF_API_KEY) {
      throw new AppError('AI Provider (Gemini or Hugging Face) not configured', 503, true, "AI_PROVIDER_NOT_CONFIGURED");
    }
  }

  // ===== DASHBOARD DATA =====
  async getExecutiveDashboard() {
    const integrations = await this.getIntegrationsOverview();
    const systemHealth = await this.getSystemHealth();
    const activeAlerts = await this.getActiveAlerts();
    const performanceMetrics = await this.getPerformanceMetrics();

    return {
      timestamp: new Date(),
      overview: {
        totalIntegrations: integrations.length,
        healthyIntegrations: integrations.filter(i => i.status === 'healthy').length,
        warningIntegrations: integrations.filter(i => i.status === 'warning').length,
        errorIntegrations: integrations.filter(i => i.status === 'error').length,
        activeAlerts: activeAlerts.length,
        systemStatus: this.getOverallSystemStatus(integrations)
      },
      integrations,
      systemHealth,
      activeAlerts: activeAlerts.slice(0, 5), // Latest 5 alerts
      performanceMetrics,
      uptime: process.uptime()
    };
  }

  async getIntegrationsOverview(): Promise<IntegrationHealth[]> {
    const integrations = ['database', 'cache', 'cloudinary', 'smtp', 'ai'];
    const results: IntegrationHealth[] = [];

    for (const integration of integrations) {
      const cached = this.healthChecks.get(integration);
      if (cached && this.isRecentCheck(cached.lastCheck)) {
        results.push(cached);
      } else {
        // Perform fresh check
        const health = await this.checkIntegrationWithRetry(integration);
        this.healthChecks.set(integration, health);
        results.push(health);
      }
    }

    return results;
  }

  async getHealthSummary() {
    const integrations = await this.getIntegrationsOverview();
    const activeAlerts = await this.getActiveAlerts();
    
    return {
      status: this.getOverallSystemStatus(integrations),
      timestamp: new Date(),
      totalIntegrations: integrations.length,
      healthyIntegrations: integrations.filter(i => i.status === 'healthy').length,
      warningIntegrations: integrations.filter(i => i.status === 'warning').length,
      errorIntegrations: integrations.filter(i => i.status === 'error').length,
      activeAlerts: activeAlerts.length,
      uptime: process.uptime()
    };
  }

  // ===== SYSTEM HEALTH =====
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Obter dados dinâmicos do ambiente (Container, Cloud, VPS)
      const [cpu, mem, osInfo, fsSize, load] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.osInfo(),
        si.fsSize(),
        si.currentLoad()
      ]);

      return {
        cpu: {
          usage: load.currentLoad, // Carga real da CPU no momento
          cores: cpu.cores,
          model: `${cpu.manufacturer} ${cpu.brand}`,
          loadAverage: load.avgLoad
        },
        memory: {
          total: mem.total,
          used: mem.active, // Memória ativa é mais precisa que usada
          free: mem.available,
          usage: (mem.active / mem.total) * 100,
          swapUsed: mem.swapused,
          swapTotal: mem.swaptotal
        },
        disk: {
          usage: fsSize.length > 0 ? fsSize[0].use : 0,
          total: fsSize.length > 0 ? fsSize[0].size : 0,
          bg: fsSize.length > 0 ? fsSize[0].mount : '/'
        },
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          hostname: osInfo.hostname
        },
        uptime: os.uptime(),
        environment: process.env.NODE_ENV || 'development'
      };
    } catch (error) {
      logger.error('Erro ao coletar métricas avançadas:', error);
      // Fallback para os nativo se falhar
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      return {
        cpu: {
          usage: await this.getCPUUsage(),
          cores: cpus.length,
          model: cpus[0]?.model || 'Unknown'
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usage: (usedMem / totalMem) * 100
        },
        disk: {
          usage: 0
        },
        uptime: os.uptime()
      };
    }
  }

  // ===== PERFORMANCE METRICS =====
  async getPerformanceMetrics() {
    const integrations = await this.getIntegrationsOverview();
    const avgResponseTime = integrations.reduce((acc, curr) => acc + curr.responseTime, 0) / integrations.length;

    return {
      averageResponseTime: avgResponseTime,
      integrations: integrations.map(i => ({
        name: i.name,
        responseTime: i.responseTime,
        status: i.status
      })),
      systemLoad: await this.getCPUUsage(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  // ===== RESOURCE USAGE =====
  async getResourceUsage() {
    const systemHealth = await this.getSystemHealth();
    const processMemory = process.memoryUsage();

    return {
      system: systemHealth,
      process: {
        memory: processMemory,
        cpu: await this.getCPUUsage(),
        uptime: process.uptime()
      },
      timestamp: new Date()
    };
  }

  // ===== ALERTS MANAGEMENT =====
  async getActiveAlerts(): Promise<Alert[]> {
    return this.alerts.filter(alert => !alert.resolved);
  }

  async getAlertsHistory(limit: number = 50, resolved?: boolean): Promise<Alert[]> {
    let filteredAlerts = this.alerts;
    
    if (resolved !== undefined) {
      filteredAlerts = this.alerts.filter(alert => alert.resolved === resolved);
    }
    
    return filteredAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  private createAlert(type: Alert['type'], integration: string, message: string): void {
    const alert: Alert = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      integration,
      message,
      timestamp: new Date(),
      resolved: false
    };
    
    this.alerts.push(alert);
    logger.error(`ALERT [${type.toUpperCase()}] ${integration}: ${message}`);
  }

  private resolveAlertsForIntegration(integration: string): void {
    const now = new Date();
    this.alerts.forEach(alert => {
      if (alert.integration === integration && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = now;
      }
    });
  }

  // ===== UTILITY METHODS =====
  private getOverallSystemStatus(integrations: IntegrationHealth[]): 'healthy' | 'warning' | 'error' {
    const hasError = integrations.some(i => i.status === 'error');
    const hasWarning = integrations.some(i => i.status === 'warning');
    
    if (hasError) return 'error';
    if (hasWarning) return 'warning';
    return 'healthy';
  }

  private isRecentCheck(lastCheck: Date): boolean {
    return Date.now() - lastCheck.getTime() < 60000; // 1 minute
  }

  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const usage = totalUsage / 1000000; // Convert to percentage
        resolve(Math.min(usage * 100, 100));
      }, 100);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===== SINGLETON EXPORT =====
export const enterpriseMonitoringService = new EnterpriseMonitoringService();
export default enterpriseMonitoringService;
