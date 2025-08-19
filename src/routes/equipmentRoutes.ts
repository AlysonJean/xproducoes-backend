import { Router } from "express";
import { EquipmentController } from "../controllers/equipmentController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { cacheMiddleware } from "../middlewares/cacheMiddleware";
import { uploadSingle } from "../middlewares/upload";

const equipmentRoutes: Router = Router();
const equipmentController = new EquipmentController();

// --- Rotas Públicas (com cache otimizado) ---
equipmentRoutes.get("/search", cacheMiddleware, equipmentController.search);
equipmentRoutes.get("/category/:categoryId", cacheMiddleware, equipmentController.getByCategory);
equipmentRoutes.get("/", cacheMiddleware, equipmentController.findAll);
equipmentRoutes.get("/:id", cacheMiddleware, equipmentController.findOne); // 10 min
equipmentRoutes.get(
  "/:id/availability",
  cacheMiddleware,
  equipmentController.getAvailability,
); // 3 min

// Alias para plural (compatibilidade REST e testes)
equipmentRoutes.get("/equipments", cacheMiddleware, equipmentController.findAll);
equipmentRoutes.get("/equipments/:id", cacheMiddleware, equipmentController.findOne);

// --- Rotas de Admin (protegidas, sem cache) ---
equipmentRoutes.post(
  "/",
  authMiddleware,
  uploadSingle("image"),
  require("../middlewares/upload").processUpload,
  equipmentController.create,
);
equipmentRoutes.put(
  "/:id",
  authMiddleware,
  uploadSingle("image"),
  require("../middlewares/upload").processUpload,
  equipmentController.update,
);
equipmentRoutes.delete("/:id", authMiddleware, equipmentController.delete);

export default equipmentRoutes;
