import { Router, type Router as RouterType } from "express";
import { ReviewController } from "../controllers/reviewController";
import { authenticate, requireAdmin } from "../middlewares/unifiedAuth";
import { reviewRateLimit } from "../middlewares/rateLimitMiddleware";

const reviewRoutes: RouterType = Router();
const reviewController = new ReviewController();

// Rotas públicas
reviewRoutes.get("/", reviewController.getAll);
// Alias para compatibilidade REST/testes
reviewRoutes.get("/reviews", reviewController.getAll);
reviewRoutes.get("/public", reviewController.getPublicReviews);
reviewRoutes.get("/equipment/:equipmentId", reviewController.getByEquipment);
reviewRoutes.get("/stats", reviewController.getStats);
reviewRoutes.get("/recent", reviewController.getRecent);

// Rotas protegidas (com rate limit anti-spam)
reviewRoutes.post("/", authenticate, reviewRateLimit, reviewController.create);
reviewRoutes.get("/user/:userId", authenticate, reviewController.getByUser);
reviewRoutes.put("/:id", authenticate, reviewRateLimit, reviewController.update);
reviewRoutes.delete("/:id", authenticate, reviewController.delete);

// Rotas administrativas
reviewRoutes.post("/:id/approve", authenticate, requireAdmin, reviewController.approve);
reviewRoutes.post("/:id/reject", authenticate, requireAdmin, reviewController.reject);

export default reviewRoutes;
