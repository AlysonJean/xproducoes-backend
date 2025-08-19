"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observabilityMiddleware = exports.metricsCollector = void 0;
exports.configureTelemetry = configureTelemetry;
class MetricsCollector {
    constructor() {
        this.metrics = {
            requests: 0,
            errors: 0,
            responseTime: 0,
            slowQueries: [],
            uptime: Date.now(),
        };
        this.alerts = [];
    }
    getMetrics() {
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
    addSlowQuery(query) {
        this.metrics.slowQueries.push({
            ...query,
            timestamp: new Date(),
        });
    }
    addAlert(alert) {
        this.alerts.push({
            ...alert,
            timestamp: new Date(),
        });
    }
    getAlerts() {
        return this.alerts;
    }
    clearOldAlerts() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        this.alerts = this.alerts.filter(alert => alert.timestamp > oneHourAgo);
    }
}
function configureTelemetry() {
    console.log("Telemetria configurada");
    // Limpar alertas antigos a cada hora
    setInterval(() => {
        exports.metricsCollector.clearOldAlerts();
    }, 60 * 60 * 1000);
}
exports.metricsCollector = new MetricsCollector();
const observabilityMiddleware = (req, res, next) => {
    const start = Date.now();
    exports.metricsCollector.incrementRequests();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 1000) {
            exports.metricsCollector.addSlowQuery({
                url: req.url,
                method: req.method,
                duration,
            });
        }
        if (res.statusCode >= 400) {
            exports.metricsCollector.incrementErrors();
            if (res.statusCode >= 500) {
                exports.metricsCollector.addAlert({
                    level: "critical",
                    message: `Server error on ${req.method} ${req.url}`,
                });
            }
        }
    });
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
};
exports.observabilityMiddleware = observabilityMiddleware;
