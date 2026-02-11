// Caminho do arquivo: backend/src/routes/geminiRoutes.ts

import { createSafeRouter } from "../middlewares/safeRouter";
import { GeminiController } from "../controllers/geminiController";

const geminiRoutes = createSafeRouter();
const geminiController = new GeminiController();

// Rota pública para qualquer pessoa poder receber uma sugestão de evento
geminiRoutes.get("/suggest-theme", geminiController.suggestEventTheme);

export default geminiRoutes;
