"use strict";
// src/controllers/geminiController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiController = void 0;
const geminiService_1 = require("../services/geminiService");
const geminiService = new geminiService_1.GeminiService();
class GeminiController {
    constructor() {
        /**
         * Sugere um tema de evento com base nos equipamentos disponíveis.
         * Rota pública para engajar clientes.
         */
        this.suggestEventTheme = async (req, res, next) => {
            try {
                const suggestion = await geminiService.suggestEventTheme();
                return res.json({ suggestion });
            }
            catch (error) {
                return next(error);
            }
        };
    }
}
exports.GeminiController = GeminiController;
