import { createSafeRouter } from "../middlewares/safeRouter";
import { PaymentController } from "../controllers/paymentController";
import { authenticate, requireAdmin } from "../middlewares/unifiedAuth";
import { paymentRateLimit } from "../middlewares/rateLimitMiddleware";

const paymentRoutes = createSafeRouter();
const paymentController = new PaymentController();

// Webhook do gateway (Stripe) — registrado ANTES do authenticate global, pois
// o provedor externo nunca terá um token de sessão do app; a autenticação
// desse endpoint é a verificação de assinatura feita dentro do controller,
// não um JWT. Registrar depois do `.use(authenticate)` (como estava) fazia
// esse endpoint exigir login, algo que nenhum webhook real conseguiria ter.
paymentRoutes.post("/webhook", paymentController.handleStripeWebhook);

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

export default paymentRoutes;
