/**
 * 🌐 Express Server Configuration
 *
 * Configura o servidor Express com todas as dependências necessárias
 */

import express from "express";
import helmet from "helmet";
import "express-async-errors";

// Infrastructure imports
import logger from "./config/logger";
import { configureTelemetry, observabilityMiddleware } from "./config/telemetry";
import { dynamicCors } from "./config/cors";

// Presentation imports (routes)
import monitoringRoutes from "./routes/monitoringRoutes";
import apiRoutes from "./routes/index";

export async function createServer(): Promise<express.Application> {
  const app = express();

  // Configure telemetry if enabled
  if (process.env["TELEMETRY_PROVIDER"]) {
    await configureTelemetry();
  }

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }),
  );

  // Body parsing
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Observability middleware (must come before routes)
  app.use(observabilityMiddleware);

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
    } catch (error) {
      logger.error("Failed to get metrics: " + String(error));
      res.status(500).json({ error: "Failed to get metrics" });
    }
  });

  // API routes
  app.use("/api/monitoring", monitoringRoutes);
  app.use("/api", apiRoutes);

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
  app.use((error: any, req: any, res: any, next: any) => {
    logger.error("Unhandled error: " + JSON.stringify({ error: error.message, stack: error.stack, url: req.url, method: req.method }));

    res.status(500).json({
      error: "Internal server error",
      message:
        process.env["NODE_ENV"] === "development"
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

logger.info("Express server configured successfully: " + JSON.stringify({ environment: process.env["NODE_ENV"] || "development" }));

  return app;
}
