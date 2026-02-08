import { Router } from "express";
import { PortfolioController } from "../controllers/portfolioController";
import { authenticate, adminOnly } from "../middlewares/unifiedAuth";
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
  adminOnly,
  portfolioController.reorder
);
portfolioRoutes.post(
  "/",
  authenticate,
  adminOnly,
  uploadRateLimit, uploadMultiple("media"),
  require("../middlewares/upload").processUpload,
  portfolioController.create,
);
portfolioRoutes.put(
  "/:id",
  authenticate,
  adminOnly,
  uploadRateLimit, uploadMultiple("media"),
  require("../middlewares/upload").processUpload,
  portfolioController.update,
);
portfolioRoutes.delete(
  "/:id",
  authenticate,
  adminOnly,
  portfolioController.delete,
);

  

export default portfolioRoutes;
