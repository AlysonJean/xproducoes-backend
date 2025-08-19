import { Router } from "express";
import { KitController } from "../controllers/kitController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { ensureAdmin } from "../config/ensureAdmin";
import { uploadSingle } from "../middlewares/upload";

const kitRoutes: Router = Router();
const kitController = new KitController();

// Rotas Públicas
kitRoutes.get("/", kitController.findAll);
// Alias para compatibilidade REST/testes
kitRoutes.get("/kits", kitController.findAll);
kitRoutes.get("/recommended", kitController.getRecommended);
kitRoutes.get("/popular", kitController.getPopular);
kitRoutes.get("/:id", kitController.findOne);

// Rotas de Admin com upload de imagem
kitRoutes.post(
  "/",
  authMiddleware,
  ensureAdmin,
  uploadSingle("image"),
  require("../middlewares/upload").processUpload,
  kitController.create,
);
kitRoutes.put(
  "/:id",
  authMiddleware,
  ensureAdmin,
  uploadSingle("image"),
  require("../middlewares/upload").processUpload,
  kitController.update,
);
kitRoutes.delete("/:id", authMiddleware, ensureAdmin, kitController.delete);

export default kitRoutes;
