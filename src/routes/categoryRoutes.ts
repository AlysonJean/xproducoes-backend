import { Router, type Router as RouterType } from "express";
import { CategoryController } from "../controllers/categoryController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { ensureAdmin } from "../config/ensureAdmin";

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
  authMiddleware,
  ensureAdmin,
  categoryController.create,
);
categoryRoutes.put(
  "/:id",
  authMiddleware,
  ensureAdmin,
  categoryController.update,
);
categoryRoutes.delete(
  "/:id",
  authMiddleware,
  ensureAdmin,
  categoryController.delete,
);

export default categoryRoutes;
