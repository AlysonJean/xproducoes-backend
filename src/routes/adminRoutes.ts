// Caminho: backend/src/routes/adminRoutes.ts

import { Router, type Router as RouterType } from "express";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";
import { AdminController } from "../controllers/adminController";
import { UploadService } from "../services/uploadService";
import { ContactController } from "../controllers/contactController";
import { BookingController } from "../controllers/bookingController";
import adminBookingRoutes from "./adminBookingRoutes";

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

export default adminRoutes;
