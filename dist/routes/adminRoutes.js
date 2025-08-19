"use strict";
// Caminho: backend/src/routes/adminRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const uploadService_1 = require("../services/uploadService");
const contactController_1 = require("../controllers/contactController");
const bookingController_1 = require("../controllers/bookingController");
const adminBookingRoutes_1 = __importDefault(require("./adminBookingRoutes"));
const adminRoutes = (0, express_1.Router)();
const adminController = new adminController_1.AdminController();
const contactController = new contactController_1.ContactController();
const bookingController = new bookingController_1.BookingController();
const uploadService = new uploadService_1.UploadService();
adminRoutes.use(authMiddleware_1.authMiddleware, authMiddleware_1.adminOnly);
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
adminRoutes.use("/bookings", adminBookingRoutes_1.default);
exports.default = adminRoutes;
