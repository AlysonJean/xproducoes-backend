import { Router, type Router as RouterType } from "express";
import { CategoryController } from "../controllers/categoryController";
import { authenticate } from "../middlewares/unifiedAuth";
import { ensureAdmin } from "../config/ensureAdmin";
import { uploadSingle, processUpload } from "../middlewares/upload";

const categoryRoutes: RouterType = Router();
const categoryController = new CategoryController();

// Listar categorias pode ser público, mas as demais rotas são protegidas
categoryRoutes.get("/", categoryController.findAll);
// Alias para compatibilidade REST/testes
categoryRoutes.get("/categories", categoryController.findAll);
categoryRoutes.get("/with-counts", categoryController.getWithEquipmentCount);
categoryRoutes.get("/featured", categoryController.getFeatured);
categoryRoutes.get("/:id", categoryController.getById);



categoryRoutes.post(
  "/",
  uploadSingle('image'),
  processUpload,
  (req, res, next) => {
    // Log se necessário, mas body só estará completo após middlewares de parsing
    next();
  },
  authenticate,
  ensureAdmin,
  categoryController.create,
);
categoryRoutes.put(
  "/:id",
  uploadSingle('image'),
  processUpload,
  authenticate,
  ensureAdmin,
  categoryController.update,
);
categoryRoutes.delete(
  "/:id",
  authenticate,
  ensureAdmin,
  categoryController.delete,
);

export default categoryRoutes;
