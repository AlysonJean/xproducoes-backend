"use strict";
// Caminho do arquivo: backend/src/routes/geminiRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const geminiController_1 = require("../controllers/geminiController");
const geminiRoutes = (0, express_1.Router)();
const geminiController = new geminiController_1.GeminiController();
// Rota pública para qualquer pessoa poder receber uma sugestão de evento
geminiRoutes.get("/suggest-theme", geminiController.suggestEventTheme);
exports.default = geminiRoutes;
