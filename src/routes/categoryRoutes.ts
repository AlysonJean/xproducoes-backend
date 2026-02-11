import { createSafeRouter } from "../middlewares/safeRouter";
import { CategoryController } from "../controllers/categoryController";
import { authenticate, adminOnly } from "../middlewares/unifiedAuth";
import { uploadSingle, processUpload } from "../middlewares/upload";

import { validateBody, validateId } from "../config/validation";
import { categoryCreateSchema, categoryUpdateSchema } from "../schemas/category.schema";

const categoryRoutes = createSafeRouter();
const categoryController = new CategoryController();

// Listar categorias pode ser público, mas as demais rotas são protegidas
categoryRoutes.get("/", categoryController.findAll);
// Alias para compatibilidade REST/testes
categoryRoutes.get("/categories", categoryController.findAll);
categoryRoutes.get("/with-counts", categoryController.getWithEquipmentCount);
categoryRoutes.get("/featured", categoryController.getFeatured);
categoryRoutes.get("/:id", validateId(), categoryController.getById);

categoryRoutes.post(
  "/",
  authenticate,
  adminOnly,
  uploadSingle('image'),
  processUpload,
  validateBody(categoryCreateSchema),
  categoryController.create,
);
categoryRoutes.put(
  "/:id",
  authenticate,
  adminOnly,
  validateId(),
  uploadSingle('image'),
  processUpload,
  validateBody(categoryUpdateSchema),
  categoryController.update,
);
categoryRoutes.delete(
  "/:id",
  authenticate,
  adminOnly,
  validateId(),
  categoryController.delete,
);

export default categoryRoutes;
