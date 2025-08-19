"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const webhookRoutes = (0, express_1.Router)();
const paymentController = new paymentController_1.PaymentController();
// A rota do webhook do Stripe
webhookRoutes.post("/stripe", paymentController.handleStripeWebhook);
exports.default = webhookRoutes;
