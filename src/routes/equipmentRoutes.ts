import { createSafeRouter } from "../middlewares/safeRouter";
import { EquipmentController } from "../controllers/equipmentController";
import { authenticate, optionalAuth, adminOnly } from "../middlewares/unifiedAuth";
import { cacheMiddleware } from "../middlewares/cacheMiddleware";
import { uploadSingle, processUpload } from "../middlewares/upload";
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware';
import { validateBody, validateId } from "../config/validation";
import { equipmentCreateSchema, equipmentUpdateSchema } from "../schemas/equipment.schema";

const equipmentRoutes = createSafeRouter();
const equipmentController = new EquipmentController();

// --- Rotas Públicas (com cache otimizado) ---
// Rota de busca sem cache para garantir status de disponibilidade em tempo real na Home
equipmentRoutes.get("/search", optionalAuth, equipmentController.search);
equipmentRoutes.get("/category/:categoryId", optionalAuth, cacheMiddleware, equipmentController.getByCategory);
equipmentRoutes.get("/", optionalAuth, cacheMiddleware, equipmentController.findAll);
equipmentRoutes.get("/:id/availability", validateId(), cacheMiddleware, equipmentController.getAvailability);
equipmentRoutes.get("/:id", validateId(), cacheMiddleware, equipmentController.findOne);

// --- Rotas de Admin (protegidas, sem cache) ---
equipmentRoutes.post(
  "/",
  authenticate,
  adminOnly,
  uploadRateLimit, uploadSingle("image"),
  processUpload,
  validateBody(equipmentCreateSchema),
  equipmentController.create,
);
equipmentRoutes.put(
  "/:id",
  authenticate,
  adminOnly,
  validateId(),
  uploadRateLimit, uploadSingle("image"),
  processUpload,
  validateBody(equipmentUpdateSchema),
  equipmentController.update,
);
equipmentRoutes.delete("/:id", authenticate, adminOnly, validateId(), equipmentController.delete);
equipmentRoutes.post("/:id/duplicate", authenticate, adminOnly, validateId(), equipmentController.duplicate);

export default equipmentRoutes;
