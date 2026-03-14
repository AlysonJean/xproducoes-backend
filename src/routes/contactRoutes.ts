// Caminho: backend/src/routes/contactRoutes.ts

import { createSafeRouter } from "../middlewares/safeRouter";
import { ContactController } from "../controllers/contactController";
import { contactRateLimit } from "../middlewares/rateLimitMiddleware";

const contactRoutes = createSafeRouter();
const contactController = new ContactController();

// Rota para o formulário público
contactRoutes.post("/", contactRateLimit, contactController.submitForm);

export default contactRoutes;
