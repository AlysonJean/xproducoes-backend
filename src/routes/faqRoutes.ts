import { Router, type Router as RouterType } from "express";
import { FaqController } from "../controllers/faqController";
import { authenticate } from "../middlewares/unifiedAuth";
import { roleMiddleware } from "../middlewares/roleMiddleware";

const faqRoutes: RouterType = Router();
const faqController = new FaqController();

// Rota pública para qualquer visitante ver o FAQ
faqRoutes.get("/", faqController.findAll);
// Alias para compatibilidade REST/testes
faqRoutes.get("/faq", faqController.findAll);

// Rotas de Admin para gerir o FAQ
faqRoutes.post(
  "/",
  authenticate,
  roleMiddleware(["ADMIN"]),
  faqController.create,
);
faqRoutes.put(
  "/:id",
  authenticate,
  roleMiddleware(["ADMIN"]),
  faqController.update,
);
faqRoutes.delete(
  "/:id",
  authenticate,
  roleMiddleware(["ADMIN"]),
  faqController.delete,
);

export default faqRoutes;
