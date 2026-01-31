import { Router, type Router as RouterType } from "express";
import equipmentRoutes from "./equipmentRoutes";
import kitRoutes from "./kitRoutes";
import categoryRoutes from "./categoryRoutes";
import bookingRoutes from "./bookingRoutes";
import reviewRoutes from "./reviewRoutes";
import userRoutes from "./userRoutes";
import authRoutes from "./authRoutes";
import dashboardRoutes from "./dashboardRoutes";
import portfolioRoutes from "./portfolioRoutes";
import paymentRoutes from "./paymentRoutes";
import uploadRoutes from "./uploadRoutes";
import contactRoutes from "./contactRoutes";
import faqRoutes from "./faqRoutes";
import adminRoutes from "./adminRoutes";
import cartRoutes from "./cartRoutes";
import profileRoutes from "./profileRoutes";
import quoteRoutes from "./quoteRoutes";
import geminiRoutes from "./geminiRoutes";
import collaboratorRoutes from "./collaboratorRoutes";
import collaboratorPaymentRoutes from "./collaboratorPaymentRoutes";
import collaboratorMessagesRoutes from "./collaboratorMessagesRoutes";
import enterpriseMonitoringRoutes from "./enterpriseMonitoringRoutes";
import { cacheService } from "../services/cacheService";
import { performanceMonitoringMiddleware } from "../middlewares/performanceMonitoring";
import collaboratorProfileRoutes from "./collaboratorProfileRoutes";
import checklistRoutes from "./checklistRoutes";
import settingsRoutes from "./settingsRoutes";
import newsletterRoutes from "./newsletterRoutes";

const router: RouterType = Router();

// Performance monitoring middleware
router.use(performanceMonitoringMiddleware);

// Core routes
router.use("/equipment", equipmentRoutes);
router.use("/equipments", equipmentRoutes); // alias plural
router.use("/kit", kitRoutes);
router.use("/kits", kitRoutes);
router.use("/category", categoryRoutes);
router.use("/categories", categoryRoutes);
router.use("/booking", bookingRoutes);
router.use("/bookings", bookingRoutes);
router.use("/review", reviewRoutes);
router.use("/reviews", reviewRoutes);
router.use("/user", userRoutes);
router.use("/users", userRoutes);
router.use("/portfolio", portfolioRoutes);
router.use("/faq", faqRoutes);
router.use("/cart", cartRoutes);
router.use("/dashboard", dashboardRoutes);

// Auth routes
router.use("/auth", authRoutes);

// Feature routes
router.use("/payments", paymentRoutes);
// router.use("/uploads", uploadRoutes); // Removido - agora usa Cloudinary
router.use("/contact", contactRoutes);
router.use("/profile", profileRoutes);
router.use("/quotes", quoteRoutes);
router.use("/gemini", geminiRoutes);
router.use("/collaborators", collaboratorRoutes);
router.use('/logo', require('./logoRoutes').default);

// Admin routes
router.use("/admin", adminRoutes);

// Enterprise Monitoring routes (Admin only)
router.use("/monitoring", enterpriseMonitoringRoutes);

// Upload routes (Cloudinary uploads)
// Expose both /upload and /uploads for compatibility with frontend expectations
router.use('/upload', uploadRoutes);
router.use('/uploads', uploadRoutes);
router.use('/collaborator-payments', collaboratorPaymentRoutes);
router.use('/collaborator/messages', collaboratorMessagesRoutes);
router.use('/collaborator/checklists', checklistRoutes);
router.use('/settings', settingsRoutes);
router.use('/newsletter', newsletterRoutes);

// Health endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: process.env["npm_package_version"] || "1.0.0",
    environment: process.env["NODE_ENV"] || "development",
  });
});

// Health detailed endpoint
router.get("/health/detailed", (req, res) => {
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
      rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      external: Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100,
    },
  });
});

// Cache health endpoint
router.get("/health/cache", async (req, res) => {
  try {
    const cacheHealth = await cacheService.healthCheck();
    const cacheStats = await cacheService.getStats();

    res.json({
      status: cacheHealth.status,
      timestamp: new Date().toISOString(),
      cache: {
        ...cacheHealth,
        stats: cacheStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      cache: {
        status: "error",
        error: String(error),
      },
    });
  }
});

// Endpoint público para demonstração das métricas de segurança (remover em produção)
// REMOVIDO: Este endpoint foi usado apenas para demonstração e testes
// As métricas reais estão disponíveis apenas para administradores em /api/admin/security/*

export default router;
