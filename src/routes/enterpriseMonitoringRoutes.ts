import { createSafeRouter } from "../middlewares/safeRouter";
import { enterpriseMonitoringController } from "../controllers/enterpriseMonitoringController";
import { authenticateWithDB, requireAdmin } from "../middlewares/unifiedAuth";

const router = createSafeRouter();

// ===== PROTEÇÃO DE ROTAS =====
// Todas as rotas de monitoramento requerem autenticação de admin
// authenticateWithDB revalida isActive/role no banco a cada requisição.
router.use(authenticateWithDB);
router.use(requireAdmin);

// ===== DASHBOARD EXECUTIVO =====
router.get("/dashboard", enterpriseMonitoringController.getDashboard);

// ===== VISÃO GERAL DAS INTEGRAÇÕES =====
router.get("/integrations/overview", enterpriseMonitoringController.getIntegrationsOverview);

// ===== TESTE DE INTEGRAÇÕES =====
router.post("/integrations/:name/test", enterpriseMonitoringController.testIntegration);

// ===== RESUMO DE SAÚDE =====
router.get("/health/summary", enterpriseMonitoringController.getHealthSummary);

// ===== HEALTH CHECK SIMPLES =====
router.get("/health", enterpriseMonitoringController.healthCheck);

// ===== MÉTRICAS DE PERFORMANCE =====
router.get("/metrics/performance", enterpriseMonitoringController.getPerformanceMetrics);

// ===== SAÚDE DO SISTEMA =====
router.get("/system/health", enterpriseMonitoringController.getSystemHealth);

// ===== USO DE RECURSOS =====
router.get("/resources/usage", enterpriseMonitoringController.getResourceUsage);

// ===== ALERTAS ATIVOS =====
router.get("/alerts/active", enterpriseMonitoringController.getActiveAlerts);

// ===== HISTÓRICO DE ALERTAS =====
router.get("/alerts/history", enterpriseMonitoringController.getAlertsHistory);

export default router;
