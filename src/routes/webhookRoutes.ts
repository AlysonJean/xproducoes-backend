import { Router, type Router as RouterType } from "express";
import { PaymentController } from "../controllers/paymentController";

const webhookRoutes: RouterType = Router();
const paymentController = new PaymentController();

// A rota do webhook do Stripe
webhookRoutes.post("/stripe", paymentController.handleStripeWebhook);

export default webhookRoutes;
