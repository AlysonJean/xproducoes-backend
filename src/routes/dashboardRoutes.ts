// Caminho: backend/src/routes/dashboardRoutes.ts

import { Router, type Router as RouterType } from "express";
import { DashboardController } from "../controllers/dashboardController";
import { authenticate, requireAdmin } from "../middlewares/unifiedAuth";
import { cacheMiddleware } from "../middlewares/cacheMiddleware";
import { dashboardRateLimit } from "../middlewares/rateLimitMiddleware";

const dashboardRoutes: RouterType = Router();
const dashboardController = new DashboardController();

// Todas as rotas do dashboard requerem login de admin + rate limit
dashboardRoutes.use(authenticate, requireAdmin, dashboardRateLimit);

// Rotas com cache aplicado (ETAPA 2 - Performance)
dashboardRoutes.get("/", cacheMiddleware, dashboardController.getStats);
// Alias para compatibilidade REST/testes
dashboardRoutes.get("/dashboard", cacheMiddleware, dashboardController.getStats);
dashboardRoutes.get("/stats", cacheMiddleware, dashboardController.getStats);
dashboardRoutes.get(
  "/chart-data",
  cacheMiddleware,
  dashboardController.getChartData,
);
dashboardRoutes.get(
  "/recent-activities",
  cacheMiddleware,
  dashboardController.getRecentActivities,
); // 3 min
dashboardRoutes.get(
  "/recent-activity",
  cacheMiddleware,
  dashboardController.getRecentActivity,
);
dashboardRoutes.get(
  "/monthly-revenue",
  dashboardController.getMonthlyRevenue,
); // 30 min
dashboardRoutes.get(
  "/revenue",
  cacheMiddleware,
  dashboardController.getRevenue,
);
dashboardRoutes.get(
  "/booking-trends",
  cacheMiddleware,
  dashboardController.getBookingTrends,
);
dashboardRoutes.get(
  "/top-equipment",
  cacheMiddleware,
  dashboardController.getTopEquipment,
);
dashboardRoutes.get(
  "/top-clients",
  cacheMiddleware,
  dashboardController.getTopClients,
);
dashboardRoutes.get(
  "/live-stats",
  dashboardController.getLiveStats, // Sem cache para dados em tempo real
);
dashboardRoutes.get(
  "/notifications",
  cacheMiddleware,
  dashboardController.getNotifications,
);
dashboardRoutes.get(
  "/available-years",
  cacheMiddleware,
  dashboardController.getAvailableYears,
); // 1 hora

export default dashboardRoutes;
