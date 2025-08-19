import { Router, type Router as RouterType } from "express";
import { PaymentController } from "../controllers/paymentController";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";

const paymentRoutes: RouterType = Router();
const paymentController = new PaymentController();

paymentRoutes.use(authMiddleware);

// Rotas para usuários
paymentRoutes.post(
  "/create-checkout-session",
  paymentController.createCheckoutSession,
);
paymentRoutes.post(
  "/create-intent/:bookingId",
  paymentController.createPaymentIntent,
);
paymentRoutes.post(
  "/confirm/:paymentIntentId",
  paymentController.confirmPayment,
);
paymentRoutes.get("/history", paymentController.getHistory);
paymentRoutes.get("/booking/:bookingId", paymentController.getByBooking);

// Rotas administrativas
paymentRoutes.post(
  "/refund/:paymentId",
  adminOnly,
  paymentController.refund,
);
paymentRoutes.get(
  "/all",
  adminOnly,
  paymentController.getAllPayments,
);
paymentRoutes.get(
  "/stats",
  adminOnly,
  paymentController.getPaymentStats,
);

// Webhook (sem autenticação)
paymentRoutes.post("/webhook", paymentController.handleStripeWebhook);

export default paymentRoutes;
