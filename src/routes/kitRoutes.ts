import { createSafeRouter } from "../middlewares/safeRouter";
import { KitController } from "../controllers/kitController";
import { authenticate, adminOnly, optionalAuth } from "../middlewares/unifiedAuth";
import { uploadSingle, processUpload } from "../middlewares/upload";
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware';

const kitRoutes = createSafeRouter();
const kitController = new KitController();

// Rotas Públicas
kitRoutes.get("/recommended", kitController.getRecommended);
kitRoutes.get("/popular", kitController.getPopular);
kitRoutes.get("/", optionalAuth, kitController.findAll);
kitRoutes.get("/:id", kitController.findOne);

// Rotas de Admin com upload de imagem
kitRoutes.post(
  "/",
  authenticate,
  adminOnly,
  uploadRateLimit, uploadSingle("image"),
  processUpload,
  kitController.create,
);
kitRoutes.put(
  "/:id",
  authenticate,
  adminOnly,
  uploadRateLimit, uploadSingle("image"),
  processUpload,
  kitController.update,
);
kitRoutes.delete("/:id", authenticate, adminOnly, kitController.delete);

export default kitRoutes;
