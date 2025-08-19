import { Router } from "express";
import { QuoteController } from "../controllers/quoteController";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";

const router = Router();
const quoteController = new QuoteController();

// Rota pública para submeter quote
router.post("/", quoteController.submit.bind(quoteController));

// Rotas protegidas (admin)
router.get("/", authMiddleware, adminOnly, quoteController.getAll.bind(quoteController));
router.get("/:id", authMiddleware, adminOnly, quoteController.getById.bind(quoteController));
router.patch("/:id/status", authMiddleware, adminOnly, quoteController.updateStatus.bind(quoteController));
router.post("/:id/respond", authMiddleware, adminOnly, quoteController.respond.bind(quoteController));

export default router;
