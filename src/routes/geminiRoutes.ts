// Caminho do arquivo: backend/src/routes/geminiRoutes.ts

import { Router, type Router as RouterType } from "express";
import { GeminiController } from "../controllers/geminiController";

const geminiRoutes: RouterType = Router();
const geminiController = new GeminiController();

// Rota pública para qualquer pessoa poder receber uma sugestão de evento
geminiRoutes.get("/suggest-theme", geminiController.suggestEventTheme);

export default geminiRoutes;
