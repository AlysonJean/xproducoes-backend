import { Router } from "express";
import { EquipmentController } from "../controllers/equipmentController";
import { authenticate } from "../middlewares/unifiedAuth";
import { cacheMiddleware } from "../middlewares/cacheMiddleware";
import { uploadSingle } from "../middlewares/upload";

const equipmentRoutes: Router = Router();
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware';
const equipmentController = new EquipmentController();

// --- Rotas Públicas (com cache otimizado) ---
equipmentRoutes.get("/search", cacheMiddleware, equipmentController.search);
equipmentRoutes.get("/category/:categoryId", cacheMiddleware, equipmentController.getByCategory);
equipmentRoutes.get("/", cacheMiddleware, equipmentController.findAll);
equipmentRoutes.get("/:id/availability", cacheMiddleware, equipmentController.getAvailability); // 3 min
equipmentRoutes.get("/:id", cacheMiddleware, equipmentController.findOne); // 10 min

// --- Rotas de Admin (protegidas, sem cache) ---
equipmentRoutes.post(
  "/",
  authenticate,
  uploadRateLimit, uploadSingle("image"),
  require("../middlewares/upload").processUpload,
  equipmentController.create,
);
equipmentRoutes.put(
  "/:id",
  authenticate,
  uploadRateLimit, uploadSingle("image"),
  require("../middlewares/upload").processUpload,
  equipmentController.update,
);
equipmentRoutes.delete("/:id", authenticate, equipmentController.delete);
equipmentRoutes.post("/:id/duplicate", authenticate, equipmentController.duplicate);

export default equipmentRoutes;
