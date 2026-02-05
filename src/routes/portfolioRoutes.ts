import { Router } from "express";
import { PortfolioController } from "../controllers/portfolioController";
import { authenticate } from "../middlewares/unifiedAuth";
import { roleMiddleware } from "../middlewares/roleMiddleware";
import { uploadMultiple } from "../middlewares/upload";
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware';

const portfolioRoutes: Router = Router();
const portfolioController = new PortfolioController();

// Rota pública para qualquer visitante ver o portfólio
portfolioRoutes.get("/", portfolioController.findAll);
// Alias para compatibilidade REST/testes
portfolioRoutes.get("/portfolio", portfolioController.findAll);

// Rotas de Admin para gerir o portfólio
portfolioRoutes.put(
  "/reorder",
  authenticate,
  roleMiddleware(["ADMIN"]),
  portfolioController.reorder
);
portfolioRoutes.post(
  "/",
  authenticate,
  roleMiddleware(["ADMIN"]),
  uploadRateLimit, uploadMultiple("media"),
  require("../middlewares/upload").processUpload,
  portfolioController.create,
);
portfolioRoutes.put(
  "/:id",
  authenticate,
  roleMiddleware(["ADMIN"]),
  uploadRateLimit, uploadMultiple("media"),
  require("../middlewares/upload").processUpload,
  portfolioController.update,
);
portfolioRoutes.delete(
  "/:id",
  authenticate,
  roleMiddleware(["ADMIN"]),
  portfolioController.delete,
);

  

export default portfolioRoutes;
