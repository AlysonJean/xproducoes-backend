"use strict";
// Caminho: backend/src/routes/dashboardRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const cacheMiddleware_1 = require("../middlewares/cacheMiddleware");
const dashboardRoutes = (0, express_1.Router)();
const dashboardController = new dashboardController_1.DashboardController();
// Todas as rotas do dashboard requerem login de admin
dashboardRoutes.use(authMiddleware_1.authMiddleware, authMiddleware_1.adminOnly);
// Rotas com cache aplicado (ETAPA 2 - Performance)
dashboardRoutes.get("/", cacheMiddleware_1.cacheMiddleware, dashboardController.getStats);
// Alias para compatibilidade REST/testes
dashboardRoutes.get("/dashboard", cacheMiddleware_1.cacheMiddleware, dashboardController.getStats);
dashboardRoutes.get("/stats", cacheMiddleware_1.cacheMiddleware, dashboardController.getStats);
dashboardRoutes.get("/chart-data", cacheMiddleware_1.cacheMiddleware, dashboardController.getChartData);
dashboardRoutes.get("/recent-activities", cacheMiddleware_1.cacheMiddleware, dashboardController.getRecentActivities); // 3 min
dashboardRoutes.get("/recent-activity", cacheMiddleware_1.cacheMiddleware, dashboardController.getRecentActivity);
dashboardRoutes.get("/monthly-revenue", dashboardController.getMonthlyRevenue); // 30 min
dashboardRoutes.get("/revenue", cacheMiddleware_1.cacheMiddleware, dashboardController.getRevenue);
dashboardRoutes.get("/booking-trends", cacheMiddleware_1.cacheMiddleware, dashboardController.getBookingTrends);
dashboardRoutes.get("/top-equipment", cacheMiddleware_1.cacheMiddleware, dashboardController.getTopEquipment);
dashboardRoutes.get("/top-clients", cacheMiddleware_1.cacheMiddleware, dashboardController.getTopClients);
dashboardRoutes.get("/live-stats", dashboardController.getLiveStats);
dashboardRoutes.get("/notifications", cacheMiddleware_1.cacheMiddleware, dashboardController.getNotifications);
dashboardRoutes.get("/available-years", cacheMiddleware_1.cacheMiddleware, dashboardController.getAvailableYears); // 1 hora
exports.default = dashboardRoutes;
