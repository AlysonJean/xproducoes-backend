import { createSafeRouter } from "../middlewares/safeRouter";
import { CouponController } from "../controllers/couponController";
import { authenticate, requireAdmin } from "../middlewares/unifiedAuth";
import { optionalAuth } from "../middlewares/unifiedAuth";
import { couponValidateRateLimit } from "../middlewares/rateLimitMiddleware";

const router = createSafeRouter();
const controller = new CouponController();

// Rota pública (cliente autenticado ou convidado) — pré-visualiza o desconto antes de enviar o orçamento
router.post("/validate", optionalAuth, couponValidateRateLimit, controller.validate);

// Rotas de Admin
router.get("/", authenticate, requireAdmin, controller.list);
router.get("/:id", authenticate, requireAdmin, controller.getById);
router.post("/", authenticate, requireAdmin, controller.create);
router.put("/:id", authenticate, requireAdmin, controller.update);
router.delete("/:id", authenticate, requireAdmin, controller.remove);

export default router;
