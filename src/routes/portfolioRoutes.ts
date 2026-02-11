import { createSafeRouter } from "../middlewares/safeRouter";
import { PortfolioController } from "../controllers/portfolioController";
import { authenticate, adminOnly } from "../middlewares/unifiedAuth";
import { uploadMultiple, processUpload } from "../middlewares/upload";
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware';
import { validateBody, validateId } from "../config/validation";
import { portfolioCreateSchema, portfolioUpdateSchema, portfolioReorderSchema } from "../schemas/portfolio.schema";

const portfolioRoutes = createSafeRouter();
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
  validateBody(portfolioReorderSchema),
  portfolioController.reorder
);
portfolioRoutes.post(
  "/",
  authenticate,
  adminOnly,
  uploadRateLimit, uploadMultiple("media"),
  processUpload,
  validateBody(portfolioCreateSchema),
  portfolioController.create,
);
portfolioRoutes.put(
  "/:id",
  authenticate,
  adminOnly,
  validateId(),
  uploadRateLimit, uploadMultiple("media"),
  processUpload,
  validateBody(portfolioUpdateSchema),
  portfolioController.update,
);
portfolioRoutes.delete(
  "/:id",
  authenticate,
  adminOnly,
  validateId(),
  portfolioController.delete,
);

  

export default portfolioRoutes;
