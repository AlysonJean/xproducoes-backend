import { createSafeRouter } from "../middlewares/safeRouter";
import { FaqController } from "../controllers/faqController";
import { authenticate, adminOnly } from "../middlewares/unifiedAuth";

const faqRoutes = createSafeRouter();
const faqController = new FaqController();

// Rota pública para qualquer visitante ver o FAQ
faqRoutes.get("/", faqController.findAll);
// Alias para compatibilidade REST/testes
faqRoutes.get("/faq", faqController.findAll);

// Rotas de Admin para gerir o FAQ
faqRoutes.post(
  "/",
  authenticate,
  adminOnly,
  faqController.create,
);
faqRoutes.put(
  "/:id",
  authenticate,
  adminOnly,
  faqController.update,
);
faqRoutes.delete(
  "/:id",
  authenticate,
  adminOnly,
  faqController.delete,
);

export default faqRoutes;
