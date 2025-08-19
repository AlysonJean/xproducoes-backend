import { Router, type Router as RouterType } from "express";
import { ReviewController } from "../controllers/reviewController";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";

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

// Rotas protegidas
reviewRoutes.post("/", authMiddleware, reviewController.create);
reviewRoutes.get("/user/:userId", authMiddleware, reviewController.getByUser);
reviewRoutes.put("/:id", authMiddleware, reviewController.update);
reviewRoutes.delete("/:id", authMiddleware, reviewController.delete);

// Rotas administrativas
reviewRoutes.post("/:id/approve", authMiddleware, adminOnly, reviewController.approve);
reviewRoutes.post("/:id/reject", authMiddleware, adminOnly, reviewController.reject);

export default reviewRoutes;
