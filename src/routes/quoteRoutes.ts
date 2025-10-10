import { Router } from "express";
import { QuoteController } from "../controllers/quoteController";
import { authenticate, requireAdmin } from "../middlewares/unifiedAuth";
import { quoteRateLimit } from "../middlewares/rateLimitMiddleware";

const router = Router();
const quoteController = new QuoteController();

// Rota pública para submeter quote (com rate limit anti-spam)
router.post("/", quoteRateLimit, quoteController.submit.bind(quoteController));

// Rotas protegidas (admin)
router.get("/", authenticate, requireAdmin, quoteController.getAll.bind(quoteController));
router.get("/:id", authenticate, requireAdmin, quoteController.getById.bind(quoteController));
router.patch("/:id/status", authenticate, requireAdmin, quoteController.updateStatus.bind(quoteController));
router.post("/:id/respond", authenticate, requireAdmin, quoteController.respond.bind(quoteController));

export default router;
