"use strict";
/**
 * 🌐 Express Server Configuration
 *
 * Configura o servidor Express com todas as dependências necessárias
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
require("express-async-errors");
// Infrastructure imports
const logger_1 = __importDefault(require("./config/logger"));
const telemetry_1 = require("./config/telemetry");
// Presentation imports (routes)
const monitoringRoutes_1 = __importDefault(require("./routes/monitoringRoutes"));
const index_1 = __importDefault(require("./routes/index"));
async function createServer() {
    const app = (0, express_1.default)();
    // Configure telemetry if enabled
    if (process.env["TELEMETRY_PROVIDER"]) {
        await (0, telemetry_1.configureTelemetry)();
    }
    // Security middleware
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
    }));
    // Body parsing
    app.use(express_1.default.json({ limit: "50mb" }));
    app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
    // Observability middleware (must come before routes)
    app.use(telemetry_1.observabilityMiddleware);
    // Health check route
    app.get("/health", (req, res) => {
        const memoryUsage = process.memoryUsage();
        res.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: Math.round(process.uptime()),
            version: process.env["npm_package_version"] || "1.0.0",
            environment: process.env["NODE_ENV"] || "development",
            memory: {
                used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
                total: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
            },
        });
    });
    // Metrics endpoint
    app.get("/metrics", (req, res) => {
        try {
            // This would be implemented by the monitoring system
            res.json({
                message: "Metrics endpoint - implementation needed",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Failed to get metrics: " + String(error));
            res.status(500).json({ error: "Failed to get metrics" });
        }
    });
    // API routes
    app.use("/api/monitoring", monitoringRoutes_1.default);
    app.use("/api", index_1.default);
    // API documentation
    app.get("/api", (req, res) => {
        res.json({
            name: "X-Produções API",
            version: process.env["npm_package_version"] || "1.0.0",
            description: "Clean Architecture Backend API",
            environment: process.env["NODE_ENV"] || "development",
            timestamp: new Date().toISOString(),
            endpoints: {
                health: "/health",
                metrics: "/metrics",
                monitoring: "/api/monitoring/*",
                docs: "/api/docs",
            },
        });
    });
    // Error handling middleware
    app.use((error, req, res, next) => {
        logger_1.default.error("Unhandled error: " + JSON.stringify({ error: error.message, stack: error.stack, url: req.url, method: req.method }));
        res.status(500).json({
            error: "Internal server error",
            message: process.env["NODE_ENV"] === "development"
                ? error.message
                : "Something went wrong",
        });
    });
    // 404 handler
    app.use("*", (req, res) => {
        res.status(404).json({
            error: "Route not found",
            path: req.originalUrl,
            timestamp: new Date().toISOString(),
        });
    });
    logger_1.default.info("Express server configured successfully: " + JSON.stringify({ environment: process.env["NODE_ENV"] || "development" }));
    return app;
}
