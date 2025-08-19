"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const paymentRoutes = (0, express_1.Router)();
const paymentController = new paymentController_1.PaymentController();
paymentRoutes.use(authMiddleware_1.authMiddleware);
// Rotas para usuários
paymentRoutes.post("/create-checkout-session", paymentController.createCheckoutSession);
paymentRoutes.post("/create-intent/:bookingId", paymentController.createPaymentIntent);
paymentRoutes.post("/confirm/:paymentIntentId", paymentController.confirmPayment);
paymentRoutes.get("/history", paymentController.getHistory);
paymentRoutes.get("/booking/:bookingId", paymentController.getByBooking);
// Rotas administrativas
paymentRoutes.post("/refund/:paymentId", authMiddleware_1.adminOnly, paymentController.refund);
paymentRoutes.get("/all", authMiddleware_1.adminOnly, paymentController.getAllPayments);
paymentRoutes.get("/stats", authMiddleware_1.adminOnly, paymentController.getPaymentStats);
// Webhook (sem autenticação)
paymentRoutes.post("/webhook", paymentController.handleStripeWebhook);
exports.default = paymentRoutes;
