import { createSafeRouter } from "../middlewares/safeRouter";
import { PaymentController } from "../controllers/paymentController";
import { authenticate, requireAdmin } from "../middlewares/unifiedAuth";
import { paymentRateLimit } from "../middlewares/rateLimitMiddleware";

const paymentRoutes = createSafeRouter();
const paymentController = new PaymentController();

paymentRoutes.use(authenticate);

// Rotas para usuários
paymentRoutes.post(
  "/create-checkout-session",
  paymentRateLimit,
  paymentController.createCheckoutSession,
);
paymentRoutes.post(
  "/create-intent/:bookingId",
  paymentRateLimit,
  paymentController.createPaymentIntent,
);
paymentRoutes.post(
  "/confirm/:paymentIntentId",
  paymentRateLimit,
  paymentController.confirmPayment,
);
paymentRoutes.get("/history", paymentController.getHistory);
paymentRoutes.get("/booking/:bookingId", paymentController.getByBooking);

// Rotas administrativas
paymentRoutes.post(
  "/refund/:paymentId",
  requireAdmin,
  paymentController.refund,
);
paymentRoutes.get(
  "/all",
  requireAdmin,
  paymentController.getAllPayments,
);
paymentRoutes.get(
  "/stats",
  requireAdmin,
  paymentController.getPaymentStats,
);

// Webhook (sem autenticação)
paymentRoutes.post("/webhook", paymentController.handleStripeWebhook);

export default paymentRoutes;
