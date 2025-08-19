import { Router } from "express";
import { PortfolioController } from "../controllers/portfolioController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";
import { uploadSingle } from "../middlewares/upload";

const portfolioRoutes: Router = Router();
const portfolioController = new PortfolioController();

// Rota pública para qualquer visitante ver o portfólio
portfolioRoutes.get("/", portfolioController.findAll);
// Alias para compatibilidade REST/testes
portfolioRoutes.get("/portfolio", portfolioController.findAll);

// Rotas de Admin para gerir o portfólio
portfolioRoutes.post(
  "/",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  uploadSingle("image"),
  require("../middlewares/upload").processUpload,
  portfolioController.create,
);
portfolioRoutes.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  uploadSingle("image"),
  require("../middlewares/upload").processUpload,
  portfolioController.update,
);
portfolioRoutes.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  portfolioController.delete,
);

  

export default portfolioRoutes;
