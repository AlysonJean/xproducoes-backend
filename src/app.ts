import express from "express";
import path from "node:path";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import { dynamicCors, allowedOrigins } from "./config/cors.js";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.js";
import apiV1 from "./api/v1.js";
import cepRoutes from './routes/cepRoutes.js';
import { securityMonitoringMiddleware } from "./config/securityMonitor.js";
import { sitemapController } from "./controllers/sitemapController.js";
import { requestIdMiddleware } from "./middlewares/requestIdMiddleware.js";
import { healthCheck, readinessCheck, metricsEndpoint } from "./controllers/healthController.js";
import { performanceMonitoringMiddleware } from "./middlewares/performanceMonitoring.js";
import { setupSwagger } from "./config/swagger.js";
import { initSentry, sentryErrorHandler } from "./config/sentryEnhanced.js";
import { csrfTokenGenerator, csrfTokenValidator, getCsrfToken } from "./middlewares/csrfMiddleware.js";
import { createApiRateLimiter, createAuthRateLimiter, createUploadRateLimiter, createCsrfRateLimiter } from "./middlewares/adaptiveRateLimiter.js";
import { inputSanitizationMiddleware } from "./middlewares/inputSanitization.js";
import { monitoringMiddleware, prometheusMetricsEndpoint, getDashboardSummary } from "./monitoring/advancedMetrics.js";
import { isValidInternalKey } from "./utils/internalApiKey.js";

dotenv.config();

const appDirPath = path.resolve(process.cwd(), "src");

const app = express();

// ✅ TRUST PROXY FOR RENDER/LOAD BALANCERS
// Necessário para que o express-rate-limit funcione corretamente
app.set("trust proxy", 1);

// ✅ HTTPS Redirect in production (enforce HTTPS)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Inicializar Sentry (deve ser o primeiro)
initSentry(app);

// Request ID deve ser o segundo middleware (após Sentry) para rastreamento completo
app.use(requestIdMiddleware);

// Performance monitoring (coleta métricas de todas as requisições)
app.use(performanceMonitoringMiddleware);

// Advanced metrics monitoring (2026 standard - for Prometheus + Grafana)
app.use(monitoringMiddleware());

// CORS middleware
app.use(dynamicCors);

// Segurança
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
// Cabeçalhos de segurança adicionais (CSP gerido aqui para maior controle)
app.use((req, res, next) => {
  // CSP restritivo — sem 'unsafe-inline' em style-src nem script-src
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' https:; script-src 'self' https:; font-src 'self' https:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), accelerometer=(), gyroscope=()');
  // Adiciona Strict-Transport-Security em produção
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});
// Logs
app.use(morgan("dev"));

// Apply adaptive rate limiting
app.use(createApiRateLimiter());

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
  app.use(express.static(path.join(appDirPath, "../public")));
  app.get("/manifest.webmanifest", (req, res) => {
    res.sendFile(path.join(appDirPath, "../public/manifest.webmanifest"));
  });
  app.get("/service-worker.js", (req, res) => {
    res.sendFile(path.join(appDirPath, "../public/service-worker.js"));
  });
}

// Removido: não servimos uploads locais (Cloudinary apenas)
// Cookie parser (deve vir antes das rotas que usam cookies)
app.use(cookieParser());

// ✅ CSRF TOKEN GENERATION (antes de rotas, depois de cookies)
app.use(csrfTokenGenerator);

// Body parser. Nota: MAX_FILE_SIZE aqui só limita o tamanho do corpo JSON/
// urlencoded — uploads multipart (imagens/vídeos) passam pelo multer e
// seguem o limite de 50MB definido em uploadService.getCloudinaryMulterConfig,
// não este valor. O nome da env var é enganoso, mas mantido como está para
// não quebrar configuração já definida em produção.
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Input sanitization (após body parser, antes das rotas)
app.use(inputSanitizationMiddleware);

// ✅ CSRF TOKEN VALIDATION (após body parser, antes das rotas)
// Applies to all /api/v1 routes but skips exempt public endpoints (auth, login, register, etc)
app.use('/api/v1', csrfTokenValidator);

// Swagger API Documentation
setupSwagger(app);

// ✅ CSRF TOKEN ENDPOINT (GET - no validation needed, but rate limited)
const csrfRateLimiter = createCsrfRateLimiter();
app.get("/api/v1/csrf-token", csrfRateLimiter, getCsrfToken);

// ✅ AUTH RATE LIMITING (before auth routes)
const authRateLimiter = createAuthRateLimiter();
app.use('/api/v1/auth', authRateLimiter);

// ✅ UPLOAD RATE LIMITING (before upload routes)
const uploadRateLimiter = createUploadRateLimiter();
app.use('/api/v1/upload', uploadRateLimiter);

// Versionamento de API
app.use("/api/v1", apiV1);
app.use('/api/v1/cep', cepRoutes);
app.use("/api", apiV1); // Compatibilidade para testes e frontend

// Health checks - Kubernetes/Docker probes
app.get("/health", healthCheck);
app.get("/ready", readinessCheck);

// Metrics endpoints - SRE Dashboard data
app.get("/metrics", metricsEndpoint);

// Advanced Prometheus/Grafana metrics endpoint (with authentication)
app.get("/internal/metrics", (req, res) => {
  if (!isValidInternalKey(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  prometheusMetricsEndpoint(req, res);
});

// Advanced metrics dashboard endpoint (with authentication)
app.get("/internal/dashboard", (req, res) => {
  if (!isValidInternalKey(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  getDashboardSummary(req, res);
});

// 404 handler
app.use((req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,DELETE,OPTIONS");
     res.header(
       "Access-Control-Allow-Headers",
       "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key, X-CSRF-Token, csrf-token, x-svg-proxy-token",
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

// Error handler global enterprise-grade
app.use(globalErrorHandler);

export default app;
