// Caminho: backend/src/routes/adminRoutes.ts

import { Router, type Router as RouterType } from "express";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";
import { AdminController } from "../controllers/adminController";
import { UploadService } from "../services/uploadService";
import { ContactController } from "../controllers/contactController";
import { BookingController } from "../controllers/bookingController";
import adminBookingRoutes from "./adminBookingRoutes";
import { securityMonitor } from "../config/securityMonitor";

const adminRoutes: RouterType = Router();

const adminController = new AdminController();
const contactController = new ContactController();
const bookingController = new BookingController();
const uploadService = new UploadService();

adminRoutes.use(authMiddleware, adminOnly);

// Rotas de Clientes
adminRoutes.get("/clients", adminController.listClients);
adminRoutes.get("/clients/:id", adminController.getClientById);
adminRoutes.post("/clients", uploadService.getCloudinaryMulterConfig().single('avatar'), adminController.createClient);
adminRoutes.put("/clients/:id", uploadService.getCloudinaryMulterConfig().single('avatar'), adminController.updateClient);
adminRoutes.delete("/clients/:id", adminController.deleteClient);

// Rotas de Contatos
adminRoutes.get("/contacts", contactController.getAll);
adminRoutes.patch("/contacts/:id/read", contactController.markAsRead);

// Rotas de verificação de e-mail (apenas admin)
adminRoutes.patch('/users/:id/verify-email', adminController.verifyUserEmail.bind(adminController));
adminRoutes.post('/users/:id/resend-verification', adminController.resendVerification.bind(adminController));

// Rotas de Bookings
adminRoutes.use("/bookings", adminBookingRoutes);

// Rotas de Monitoramento de Segurança
adminRoutes.get("/security/metrics", (req, res) => {
  try {
    const metrics = securityMonitor.getSecurityMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao obter métricas de segurança",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

adminRoutes.get("/security/events", (req, res) => {
  try {
    const { type, ip, limit = 100 } = req.query;
    let events = securityMonitor.getSecurityMetrics().recentEvents;

    // Filtrar por tipo se especificado
    if (type) {
      events = events.filter(event => event.type === type);
    }

    // Filtrar por IP se especificado
    if (ip) {
      events = events.filter(event => event.ip === ip);
    }

    // Limitar resultados
    events = events.slice(-parseInt(limit as string));

    res.json({
      success: true,
      data: events,
      count: events.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao obter eventos de segurança",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

adminRoutes.get("/security/events/:ip", (req, res) => {
  try {
    const { ip } = req.params;
    const events = securityMonitor.getEventsByIP(ip);

    res.json({
      success: true,
      data: events,
      count: events.length,
      ip,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao obter eventos por IP",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

adminRoutes.post("/security/reset-metrics", (req, res) => {
  try {
    securityMonitor.resetMetrics();
    res.json({
      success: true,
      message: "Métricas de segurança resetadas com sucesso",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao resetar métricas de segurança",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default adminRoutes;
