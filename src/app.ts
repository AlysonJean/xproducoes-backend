import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import { dynamicCors } from "./config/cors";
import apiV1 from "./api/v1";
import cepRoutes from './routes/cepRoutes';
import { securityMonitoringMiddleware } from "./config/securityMonitor";
import { sitemapController } from "./controllers/sitemapController";
import { initSentry, sentryErrorHandler } from "./config/sentry";
import { requestIdMiddleware } from "./middlewares/requestIdMiddleware";
import { healthCheck, readinessCheck, metricsEndpoint } from "./controllers/healthController";
import { performanceMonitoringMiddleware } from "./middlewares/performanceMonitoring";
import { setupSwagger } from "./config/swagger";
import sponsorRoutes from './routes/sponsorRoutes';

dotenv.config();

const app = express();

// Inicializar Sentry (deve ser o primeiro)
initSentry(app);

// Request ID deve ser o segundo middleware (após Sentry) para rastreamento completo
app.use(requestIdMiddleware);

// Performance monitoring (coleta métricas de todas as requisições)
app.use(performanceMonitoringMiddleware);

// CORS middleware
app.use(dynamicCors);

// Segurança
app.use(helmet());
// Cabeçalhos de segurança adicionais (CSP gerido aqui para maior controle)
app.use((req, res, next) => {
  // CSP mais restritivo - removido 'unsafe-inline' onde possível
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' https:; font-src 'self' https:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  // Adiciona Strict-Transport-Security em produção
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});
// Logs
app.use(morgan("dev"));
// Rate limiting
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  }),
);

// Monitoramento de segurança
app.use(securityMonitoringMiddleware);

// Sitemap - Critical for SEO
app.get("/sitemap.xml", (req, res) => sitemapController.getSitemap(req, res));

// Rota raiz para verificação de saúde (Health Check)
app.get("/", (req, res) => {
  res.status(200).json({ 
    message: "API X-Produções Online 🚀",
    environment: process.env.NODE_ENV,
    version: "1.0.0"
  });
});

// Servir arquivos estáticos para manifest e service worker (produção)
if (process.env.NODE_ENV === "production") {
  const path = require("path");
  app.use(express.static(path.join(__dirname, "../public")));
  app.get("/manifest.webmanifest", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/manifest.webmanifest"));
  });
  app.get("/service-worker.js", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/service-worker.js"));
  });
}

// Removido: não servimos uploads locais (Cloudinary apenas)
// Cookie parser (deve vir antes das rotas que usam cookies)
app.use(cookieParser());
// Body parser
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Input sanitization (após body parser, antes das rotas)


import { inputSanitizationMiddleware } from "./middlewares/inputSanitization";
app.use(inputSanitizationMiddleware);

// Swagger API Documentation
setupSwagger(app);

// Versionamento de API
app.use("/api/v1", apiV1);
app.use('/api/v1/cep', cepRoutes);
app.use('/api/admin/sponsors', sponsorRoutes); // Register Sponsor Routes
app.use("/sitemap.xml", sitemapController.getSitemap);
app.use("/api", apiV1); // Compatibilidade para testes e frontend

// Health checks - Kubernetes/Docker probes
app.get("/health", healthCheck);
app.get("/ready", readinessCheck);

// Metrics endpoints - SRE Dashboard data
app.get("/metrics", metricsEndpoint);

// Prometheus/Grafana Cloud compatible endpoint (com autenticação)
import { prometheusMetricsEndpoint, metricsAuthMiddleware } from "./controllers/prometheusController";
app.get("/metrics/prometheus", metricsAuthMiddleware, prometheusMetricsEndpoint);

// 404 handler
import { allowedOrigins } from "./config/cors";
app.use((req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
     res.header(
       "Access-Control-Allow-Headers",
       "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key, x-svg-proxy-token",
     );
  }
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    message: "Rota inválida",
    data: null,
  });
});

// Sentry error handler (deve vir antes do error handler global)
app.use(sentryErrorHandler());

// Error handler global
import { Request, Response, NextFunction } from "express";
import logger from "./config/logger";

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
     res.header(
       "Access-Control-Allow-Headers",
       "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key, x-svg-proxy-token",
     );
  }
  logger.error({obj:err}, "Erro global:");
  res.status(500).json({
    success: false,
    error: err.message || "Erro interno",
    message: "Erro interno do servidor",
    data: null,
  });
});

export default app;
