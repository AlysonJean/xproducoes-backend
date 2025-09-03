import logger from "./logger";
import { metricsCollector } from "./telemetry";

export interface SecurityEvent {
  type: "invalid_token" | "expired_token" | "malformed_token" | "suspicious_activity";
  ip: string;
  userAgent: string;
  endpoint: string;
  timestamp: Date;
  details?: any;
}

export interface SecurityMetrics {
  invalidTokenAttempts: number;
  expiredTokenAttempts: number;
  malformedTokenAttempts: number;
  suspiciousActivities: number;
  blockedIPs: string[];
  recentEvents: SecurityEvent[];
}

class SecurityMonitor {
  private securityMetrics: SecurityMetrics = {
    invalidTokenAttempts: 0,
    expiredTokenAttempts: 0,
    malformedTokenAttempts: 0,
    suspiciousActivities: 0,
    blockedIPs: [],
    recentEvents: [],
  };

  private readonly ALERT_THRESHOLDS = {
    INVALID_TOKENS_PER_MINUTE: 10,
    EXPIRED_TOKENS_PER_MINUTE: 20,
    MALFORMED_TOKENS_PER_MINUTE: 5,
    SUSPICIOUS_ACTIVITIES_PER_HOUR: 50,
  };

  private readonly MAX_RECENT_EVENTS = 1000;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Limpar eventos antigos periodicamente
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldEvents();
    }, this.CLEANUP_INTERVAL);

    // Não deixe este timer manter o event loop ativo (útil para testes)
    try {
      if (this.cleanupTimer && typeof (this.cleanupTimer as any).unref === 'function') {
        (this.cleanupTimer as any).unref();
      }
    } catch (e) {
      // ignore - fall back to default behaviour
    }
  }

  // Permite que testes ou o processo limpem explicitamente o timer
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer as any);
      this.cleanupTimer = undefined;
    }
  }

  recordInvalidToken(ip: string, userAgent: string, endpoint: string, details?: any) {
    this.securityMetrics.invalidTokenAttempts++;
    this.recordEvent({
      type: "invalid_token",
      ip,
      userAgent,
      endpoint,
      timestamp: new Date(),
      details,
    });

    logger.warn({
      msg: "Tentativa de uso de token inválido",
      ip,
      endpoint,
      userAgent: userAgent?.substring(0, 100),
      details,
    });

    this.checkThresholds();
  }

  recordExpiredToken(ip: string, userAgent: string, endpoint: string, details?: any) {
    this.securityMetrics.expiredTokenAttempts++;
    this.recordEvent({
      type: "expired_token",
      ip,
      userAgent,
      endpoint,
      timestamp: new Date(),
      details,
    });

    logger.info({
      msg: "Tentativa de uso de token expirado",
      ip,
      endpoint,
      userAgent: userAgent?.substring(0, 100),
      details,
    });

    this.checkThresholds();
  }

  recordMalformedToken(ip: string, userAgent: string, endpoint: string, details?: any) {
    this.securityMetrics.malformedTokenAttempts++;
    this.recordEvent({
      type: "malformed_token",
      ip,
      userAgent,
      endpoint,
      timestamp: new Date(),
      details,
    });

    logger.warn({
      msg: "Tentativa de uso de token malformado",
      ip,
      endpoint,
      userAgent: userAgent?.substring(0, 100),
      details,
    });

    this.checkThresholds();
  }

  recordSuspiciousActivity(ip: string, userAgent: string, endpoint: string, details?: any) {
    this.securityMetrics.suspiciousActivities++;
    this.recordEvent({
      type: "suspicious_activity",
      ip,
      userAgent,
      endpoint,
      timestamp: new Date(),
      details,
    });

    logger.error({
      msg: "Atividade suspeita detectada",
      ip,
      endpoint,
      userAgent: userAgent?.substring(0, 100),
      details,
    });

    this.checkThresholds();
  }

  private recordEvent(event: SecurityEvent) {
    this.securityMetrics.recentEvents.push(event);

    // Manter apenas os eventos mais recentes
    if (this.securityMetrics.recentEvents.length > this.MAX_RECENT_EVENTS) {
      this.securityMetrics.recentEvents = this.securityMetrics.recentEvents.slice(-this.MAX_RECENT_EVENTS);
    }
  }

  private checkThresholds() {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Contar eventos nos últimos períodos
    const recentEvents = this.securityMetrics.recentEvents.filter(
      event => event.timestamp >= oneMinuteAgo
    );

    const hourlyEvents = this.securityMetrics.recentEvents.filter(
      event => event.timestamp >= oneHourAgo
    );

    const invalidTokensPerMinute = recentEvents.filter(e => e.type === "invalid_token").length;
    const expiredTokensPerMinute = recentEvents.filter(e => e.type === "expired_token").length;
    const malformedTokensPerMinute = recentEvents.filter(e => e.type === "malformed_token").length;
    const suspiciousActivitiesPerHour = hourlyEvents.filter(e => e.type === "suspicious_activity").length;

    // Verificar thresholds e gerar alertas
    if (invalidTokensPerMinute >= this.ALERT_THRESHOLDS.INVALID_TOKENS_PER_MINUTE) {
      this.generateAlert("critical", `Alto volume de tokens inválidos: ${invalidTokensPerMinute} por minuto`);
    }

    if (expiredTokensPerMinute >= this.ALERT_THRESHOLDS.EXPIRED_TOKENS_PER_MINUTE) {
      this.generateAlert("warning", `Alto volume de tokens expirados: ${expiredTokensPerMinute} por minuto`);
    }

    if (malformedTokensPerMinute >= this.ALERT_THRESHOLDS.MALFORMED_TOKENS_PER_MINUTE) {
      this.generateAlert("critical", `Alto volume de tokens malformados: ${malformedTokensPerMinute} por minuto`);
    }

    if (suspiciousActivitiesPerHour >= this.ALERT_THRESHOLDS.SUSPICIOUS_ACTIVITIES_PER_HOUR) {
      this.generateAlert("critical", `Alto volume de atividades suspeitas: ${suspiciousActivitiesPerHour} por hora`);
    }
  }

  private generateAlert(level: "critical" | "warning", message: string) {
    logger.error(`🚨 ALERTA DE SEGURANÇA [${level.toUpperCase()}]: ${message}`);

    // Adicionar ao sistema de telemetria existente
    metricsCollector.addAlert({
      level,
      message: `[SEGURANÇA] ${message}`,
    });

    // Aqui poderia ser integrado com sistemas externos como:
    // - Slack webhooks
    // - Email notifications
    // - SIEM systems
    // - PagerDuty, etc.
  }

  getSecurityMetrics(): SecurityMetrics {
    return { ...this.securityMetrics };
  }

  getEventsByIP(ip: string): SecurityEvent[] {
    return this.securityMetrics.recentEvents.filter(event => event.ip === ip);
  }

  getEventsByType(type: SecurityEvent["type"]): SecurityEvent[] {
    return this.securityMetrics.recentEvents.filter(event => event.type === type);
  }

  private cleanupOldEvents() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.securityMetrics.recentEvents = this.securityMetrics.recentEvents.filter(
      event => event.timestamp >= oneHourAgo
    );
  }

  // Método para detectar padrões suspeitos
  detectSuspiciousPatterns(ip: string): boolean {
    const eventsFromIP = this.getEventsByIP(ip);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Verificar se há muitas tentativas recentes do mesmo IP
    const recentEvents = eventsFromIP.filter(event => event.timestamp >= fiveMinutesAgo);

    if (recentEvents.length >= 20) {
      this.recordSuspiciousActivity(ip, "unknown", "multiple_attempts", {
        eventCount: recentEvents.length,
        timeWindow: "5 minutes",
      });
      return true;
    }

    return false;
  }

  // Reset das métricas (útil para testes)
  resetMetrics() {
    this.securityMetrics = {
      invalidTokenAttempts: 0,
      expiredTokenAttempts: 0,
      malformedTokenAttempts: 0,
      suspiciousActivities: 0,
      blockedIPs: [],
      recentEvents: [],
    };
  }
}

export const securityMonitor = new SecurityMonitor();

// Middleware para monitoramento de segurança
export const securityMonitoringMiddleware = (req: any, res: any, next: any) => {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.get("User-Agent") || "unknown";

  // Detectar padrões suspeitos
  securityMonitor.detectSuspiciousPatterns(ip);

  // Adicionar informações de segurança ao request
  req.securityInfo = {
    ip,
    userAgent,
    timestamp: new Date(),
  };

  next();
};
